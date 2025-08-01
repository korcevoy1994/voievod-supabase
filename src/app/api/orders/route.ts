import { NextRequest, NextResponse } from 'next/server'
import { withProtectedAccess, withPublicAccess, validateRequestData, sanitizeInput } from '@/middleware/sessionMiddleware'
import { SecureSessionManager } from '@/lib/secureSessionManager'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface OrderSeat {
  id: string // Теперь короткий 8-символьный ID
  zone: string
  row: string
  number: string
  price: number
}

interface OrderGeneralAccess {
  id: string // Теперь короткий 8-символьный ID
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

export const POST = withPublicAccess(async (request: NextRequest) => {
  try {
    console.log('🔄 POST /api/orders - начало обработки запроса')
    const supabase = createSupabaseServerClient()
    const body: CreateOrderRequest = await request.json()
    console.log('📝 Получены данные запроса:', JSON.stringify(body, null, 2))
    
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
      console.error('❌ Ошибка валидации данных:', validation.errors)
      return NextResponse.json(
        { error: 'Ошибка валидации данных', details: validation.errors },
        { status: 400 }
      )
    }
    console.log('✅ Валидация данных прошла успешно')

    // Проверка userId (базовая валидация)
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Отсутствует или некорректный ID пользователя' },
        { status: 400 }
      )
    }

    // Sanitize customer info
    const sanitizedCustomerInfo = {
      firstName: sanitizeInput(customerInfo.firstName),
      lastName: sanitizeInput(customerInfo.lastName),
      email: sanitizeInput(customerInfo.email?.toLowerCase()),
      phone: customerInfo.phone ? sanitizeInput(customerInfo.phone) : undefined
    }

    let actualUserId = userId;
    
    // Check if user with this email already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', sanitizedCustomerInfo.email)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json(
        { error: 'Ошибка проверки пользователя', details: checkError.message },
        { status: 500 }
      );
    }
    
    if (existingUsers && existingUsers.length > 0) {
      // User exists, use their ID and update their info
      actualUserId = existingUsers[0].id;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
          phone: sanitizedCustomerInfo.phone,
          is_temporary: true,
          temp_expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          updated_at: new Date().toISOString()
        })
        .eq('id', actualUserId);
      
      if (updateError) {
        console.error('Error updating existing user:', updateError);
        return NextResponse.json(
          { error: 'Ошибка обновления пользователя', details: updateError.message },
          { status: 500 }
        );
      }
      
      console.log('Updated existing user:', actualUserId);
    } else {
      // User doesn't exist, create new one
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: sanitizedCustomerInfo.email,
          full_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
          phone: sanitizedCustomerInfo.phone,
          is_temporary: true,
          temp_expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
        });
      
      if (insertError) {
        console.error('Error creating new user:', insertError);
        return NextResponse.json(
          { error: 'Ошибка создания пользователя', details: insertError.message },
          { status: 500 }
        );
      }
      
      console.log('Created new user:', userId);
    }



    // Получаем ID события (предполагаем, что у нас одно активное событие)
    console.log('🔍 Поиск активного события...')
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (eventError || !eventData) {
      console.error('❌ Ошибка получения события:', eventError)
      console.log('🔍 Проверим все события в базе...')
      const { data: allEvents } = await supabase.from('events').select('id, title, status')
      console.log('📋 Все события:', allEvents)
      return NextResponse.json(
        { error: 'Событие не найдено' },
        { status: 500 }
      )
    }
    console.log('✅ Найдено активное событие:', eventData.id)

    // Начинаем транзакцию
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        user_id: actualUserId,
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
      .select('id')
      .single()

    if (orderError) {
      console.error('Ошибка создания заказа:', orderError)
      return NextResponse.json(
        { error: 'Ошибка создания заказа' },
        { status: 500 }
      )
    }

    const orderId = orderData.id

    // Генерируем QR код и PDF URL для заказа в JSON формате
    const orderNumber = `VOEV-ORDER-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const timestamp = Date.now() / 1000;
    const checksum = require('crypto').createHash('md5').update(`${orderId}${orderNumber}${timestamp}`).digest('hex');
    
    const qrCode = JSON.stringify({
      order_id: orderId,
      order_number: orderNumber,
      timestamp: timestamp,
      checksum: checksum
    });
    const pdfUrl = `/api/tickets/pdf?orderId=${orderId}`
    
    // Обновляем заказ с QR кодом и PDF URL
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        qr_code: qrCode,
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Ошибка обновления QR кода и PDF URL:', updateError)
    } else {
      console.log('QR код и PDF URL успешно добавлены для заказа:', orderId)
    }

    // Сохраняем места в заказе
    if (seats.length > 0) {
      const orderSeats = []
      
      // Получаем UUID мест из базы данных по zone, row, number
      for (const seat of seats) {
        // Парсим составной ID места (формат: zone-row-number)
        const [zone, row, number] = seat.id.split('-')
        
        const { data: seatData, error: seatError } = await supabase
          .from('seats')
          .select('id')
          .eq('zone', zone)
          .eq('row', row)
          .eq('number', number)
          .single()
        
        if (seatError || !seatData) {
          console.error(`Ошибка поиска места ${zone}-${row}-${number}:`, seatError)
          // Откатываем заказ
          await supabase.from('orders').delete().eq('id', orderId)
          return NextResponse.json(
            { error: `Место ${zone}-${row}-${number} не найдено` },
            { status: 500 }
          )
        }
        
        orderSeats.push({
          id: crypto.randomUUID(),
          order_id: orderId,
          seat_id: seatData.id, // Используем UUID из базы данных
          price: seat.price,
          event_id: eventData.id
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
        quantity: ticket.quantity,
        event_id: eventData.id
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
        // Парсим составной ID места (формат: zone-row-number)
        const [zone, row, number] = seat.id.split('-')
        
        const { error: updateError } = await supabase
          .from('seats')
          .update({ 
            status: 'sold', 
            reserved_by: actualUserId,
            expires_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('zone', zone)
          .eq('row', row)
          .eq('number', number)

        if (updateError) {
          console.error(`Ошибка обновления статуса места ${seat.id}:`, updateError)
          // Не откатываем заказ, но логируем ошибку
        }
      }
    }

    // Создаем билеты для заказа
    const { error: ticketsError } = await supabase.rpc('create_tickets_from_order', {
      order_uuid: orderId
    })

    if (ticketsError) {
      console.error('Ошибка создания билетов:', ticketsError)
      // Не откатываем заказ, билеты можно создать позже
    } else {
      console.log('Билеты успешно созданы для заказа:', orderId)
    }

    return NextResponse.json(
      {
        success: true,
        orderId: orderId,
        orderNumber: orderNumber,
        message: 'Заказ успешно создан'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('❌ Критическая ошибка при создании заказа:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
})

// Получение заказов пользователя
export const GET = withPublicAccess(async (request: NextRequest) => {
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

    // Базовая проверка userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Отсутствует или некорректный ID пользователя' },
        { status: 400 }
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