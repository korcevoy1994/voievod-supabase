import { NextRequest, NextResponse } from 'next/server'
import { withProtectedAccess, withPublicAccess, validateRequestData, sanitizeInput } from '@/middleware/sessionMiddleware'
import { SecureSessionManager } from '@/lib/secureSessionManager'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface OrderSeat {
  id: string
  zone: string
  row: string
  number: string
  price: number
}

interface OrderGeneralAccess {
  id: string
  name: string
  price: number
  quantity: number
}

interface CreateOrderRequest {
  userId: string
  customerInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  seats: OrderSeat[]
  generalAccess: OrderGeneralAccess[]
  totalPrice: number
  totalTickets: number
  paymentMethod: string
}

export const POST = withProtectedAccess(async (request: NextRequest, sessionData: any) => {
  try {
    const supabase = createSupabaseServerClient()
    const body: CreateOrderRequest = await request.json()
    
    const {
      userId,
      customerInfo,
      seats,
      generalAccess,
      totalPrice,
      totalTickets,
      paymentMethod
    } = body

    // Валидация входящих данных
    const validationSchema = {
      userId: (value: any) => typeof value === 'string' && value.length > 0,
      'customerInfo.email': (value: any) => typeof customerInfo?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email),
      'customerInfo.firstName': (value: any) => typeof customerInfo?.firstName === 'string' && customerInfo.firstName.length > 0,
      'customerInfo.lastName': (value: any) => typeof customerInfo?.lastName === 'string' && customerInfo.lastName.length > 0
    }

    const validation = validateRequestData(body, validationSchema)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Ошибка валидации данных', details: validation.errors },
        { status: 400 }
      )
    }

    // Проверка соответствия userId с сессией
    if (sessionData && sessionData.userId !== userId) {
      return NextResponse.json(
        { error: 'Несоответствие ID пользователя' },
        { status: 403 }
      )
    }

    // Sanitize customer info
    const sanitizedCustomerInfo = {
      firstName: sanitizeInput(customerInfo.firstName),
      lastName: sanitizeInput(customerInfo.lastName),
      email: sanitizeInput(customerInfo.email?.toLowerCase()),
      phone: customerInfo.phone ? sanitizeInput(customerInfo.phone) : undefined
    }

    // Проверяем, существует ли пользователь в таблице users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // Если пользователя нет, создаем временного
    if (!existingUser) {
      const { error: userCreateError } = await supabase
        .rpc('create_temporary_user', {
          p_user_id: userId,
          p_email: sanitizedCustomerInfo.email,
          p_full_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
          p_phone: sanitizedCustomerInfo.phone || null
        })

      if (userCreateError) {
        console.error('Ошибка создания временного пользователя:', userCreateError)
        return NextResponse.json(
          { error: 'Ошибка создания пользователя' },
          { status: 500 }
        )
      }
    }



    // Начинаем транзакцию
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        customer_email: sanitizedCustomerInfo.email,
        customer_first_name: sanitizedCustomerInfo.firstName,
        customer_last_name: sanitizedCustomerInfo.lastName,
        customer_phone: sanitizedCustomerInfo.phone,
        total_price: totalPrice,
        total_tickets: totalTickets,
        payment_method: paymentMethod,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) {
      console.error('Ошибка создания заказа:', orderError)
      return NextResponse.json(
        { error: 'Ошибка создания заказа' },
        { status: 500 }
      )
    }

    const orderId = orderData.id

    // Генерируем QR код для заказа
    const { data: qrCode, error: qrError } = await supabase.rpc('generate_order_qr_code', {
      p_order_id: orderId
    })

    if (qrError) {
      console.error('Ошибка генерации QR кода:', qrError)
      // Не прерываем процесс, QR код можно сгенерировать позже
    }

    // Сохраняем места в заказе
    if (seats.length > 0) {
      const orderSeats = []
      
      // Получаем UUID мест из базы данных по zone, row, number
      for (const seat of seats) {
        const { data: seatData, error: seatError } = await supabase
          .from('seats')
          .select('id')
          .eq('zone', seat.zone)
          .eq('row', seat.row)
          .eq('number', seat.number)
          .single()
        
        if (seatError || !seatData) {
          console.error(`Ошибка поиска места ${seat.zone}-${seat.row}-${seat.number}:`, seatError)
          // Откатываем заказ
          await supabase.from('orders').delete().eq('id', orderId)
          return NextResponse.json(
            { error: `Место ${seat.zone}-${seat.row}-${seat.number} не найдено` },
            { status: 500 }
          )
        }
        
        orderSeats.push({
          id: crypto.randomUUID(),
          order_id: orderId,
          seat_id: seatData.id, // Используем UUID из базы данных
          zone: seat.zone,
          row: seat.row,
          number: seat.number,
          price: seat.price
        })
      }

      const { error: seatsError } = await supabase
        .from('order_seats')
        .insert(orderSeats)

      if (seatsError) {
        console.error('Ошибка сохранения мест:', seatsError)
        // Откатываем заказ
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { error: 'Ошибка сохранения мест' },
          { status: 500 }
        )
      }
    }

    // Сохраняем general access билеты
    if (generalAccess.length > 0) {
      const orderGeneralAccess = generalAccess.map(ticket => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        ticket_name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity
      }))

      const { error: generalError } = await supabase
        .from('order_general_access')
        .insert(orderGeneralAccess)

      if (generalError) {
        console.error('Ошибка сохранения general access:', generalError)
        // Откатываем заказ
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { error: 'Ошибка сохранения билетов' },
          { status: 500 }
        )
      }
    }

    // Обновляем статус мест на "sold" (если это места)
    if (seats.length > 0) {
      // Обновляем каждое место отдельно по zone, row, number
      for (const seat of seats) {
        const { error: updateError } = await supabase
          .from('seats')
          .update({ 
            status: 'sold', 
            reserved_by: userId,
            expires_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('zone', seat.zone)
          .eq('row', seat.row)
          .eq('number', seat.number)

        if (updateError) {
          console.error(`Ошибка обновления статуса места ${seat.id}:`, updateError)
          // Не откатываем заказ, но логируем ошибку
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        orderId: orderId,
        message: 'Заказ успешно создан'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Ошибка при создании заказа:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
})

// Получение заказов пользователя
export const GET = withProtectedAccess(async (request: NextRequest, sessionData: any) => {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      )
    }

    // Проверка соответствия userId с сессией
    if (sessionData && sessionData.userId !== userId) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_seats(*),
        order_general_access(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка получения заказов:', error)
      return NextResponse.json(
        { error: 'Ошибка получения заказов' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })

  } catch (error) {
    console.error('Ошибка при получении заказов:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
})