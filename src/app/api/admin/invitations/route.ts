import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CreateInvitationRequest {
  seats: Array<{
    id: string
    zone: string
    price: number
  }>
  recipient: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    notes?: string
  }
  totalPrice: number
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/invitations - начало обработки')
    const body: CreateInvitationRequest = await request.json()
    console.log('Получены данные:', JSON.stringify(body, null, 2))
    
    // Валидация данных
    if (!body.seats || body.seats.length === 0) {
      return NextResponse.json(
        { error: 'Необходимо выбрать места' },
        { status: 400 }
      )
    }

    if (!body.recipient.firstName || !body.recipient.lastName) {
      return NextResponse.json(
        { error: 'Необходимо указать имя и фамилию получателя' },
        { status: 400 }
      )
    }

    // Проверяем доступность мест
    const seatIds = body.seats.map(seat => seat.id)
    const { data: existingSeats, error: seatsError } = await supabase
      .from('seats')
      .select('id, status, zone, row, number')
      .in('id', seatIds)

    if (seatsError) {
      console.error('Error checking seats:', seatsError)
      return NextResponse.json(
        { error: 'Ошибка проверки мест' },
        { status: 500 }
      )
    }

    // Проверяем, что все места доступны
    const unavailableSeats = existingSeats?.filter(seat => 
      seat.status !== 'available'
    ) || []

    if (unavailableSeats.length > 0) {
      return NextResponse.json(
        { error: `Места ${unavailableSeats.map(s => s.id).join(', ')} недоступны` },
        { status: 400 }
      )
    }

    // Получаем активное событие
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'active')
      .limit(1)

    if (eventsError || !events || events.length === 0) {
      console.error('Error getting active event:', eventsError)
      return NextResponse.json(
        { error: 'Активное событие не найдено' },
        { status: 500 }
      )
    }

    const eventId = events[0].id
    console.log('Event ID:', eventId, 'Seat IDs:', seatIds)

    // Проверяем или создаем пользователя
    let userId: string = ''
    
    if (body.recipient.email) {
      console.log('Проверяем пользователя с email:', body.recipient.email)
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('email', body.recipient.email)
        .limit(1)
      console.log('Результат поиска пользователя:', existingUser, 'Ошибка:', userCheckError)

      if (userCheckError) {
        console.error('Error checking user:', userCheckError)
        return NextResponse.json(
          { error: 'Ошибка проверки пользователя' },
          { status: 500 }
        )
      }

      if (existingUser && existingUser.length > 0) {
        userId = existingUser[0].id
        
        // Обновляем данные пользователя
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            full_name: `${body.recipient.firstName} ${body.recipient.lastName}`,
            phone: body.recipient.phone || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateUserError) {
          console.error('Error updating user:', updateUserError)
        }
      }
    }
    
    if (!userId) {
      // Создаем нового временного пользователя
      const tempEmail = body.recipient.email || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 8)}@invitation.local`
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          email: tempEmail,
          full_name: `${body.recipient.firstName} ${body.recipient.lastName}`,
          phone: body.recipient.phone || null,
          is_temporary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      if (newUser) {
        userId = newUser.id
      }

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return NextResponse.json(
          { error: 'Ошибка создания пользователя' },
          { status: 500 }
        )
      }
    }


    
    // Создаем заказ
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        customer_email: body.recipient.email || `temp-${Date.now()}@invitation.local`,
        customer_first_name: body.recipient.firstName,
        customer_last_name: body.recipient.lastName,
        customer_phone: body.recipient.phone || null,
        total_price: 0, // Пригласительные бесплатные
        total_tickets: body.seats.length,
        status: 'paid', // Сразу помечаем как оплаченный
        payment_method: 'invitation'
      })
      .select('id')
      .single()

    const orderId = newOrder?.id

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Ошибка создания заказа' },
        { status: 500 }
      )
    }
    
    if (!newOrder) {
      return NextResponse.json(
        { error: 'Ошибка получения ID заказа' },
        { status: 500 }
      )
    }

    // Резервируем места
    const { error: seatsUpdateError } = await supabase
      .from('seats')
      .update({
        status: 'sold',
        updated_at: new Date().toISOString()
      })
      .in('id', seatIds)

    if (seatsUpdateError) {
      console.error('Error updating seats:', seatsUpdateError)
      return NextResponse.json(
        { error: 'Ошибка резервирования мест' },
        { status: 500 }
      )
    }

    // Создаем записи в order_seats
    const orderSeatsData = body.seats.map((seat) => {
      return {
        order_id: orderId,
        seat_id: seat.id,
        price: 0 // Пригласительные бесплатные
      }
    })

    const { error: orderSeatsError } = await supabase
      .from('order_seats')
      .insert(orderSeatsData)

    if (orderSeatsError) {
      console.error('Error creating order seats:', orderSeatsError)
      return NextResponse.json(
        { error: 'Ошибка создания связей заказ-места' },
        { status: 500 }
      )
    }

    // Создаем билеты для каждого места
    const ticketsData = []
    for (const seat of body.seats) {
      // Находим соответствующее место в данных из базы
      const seatData = existingSeats?.find(s => s.id === seat.id)
      if (!seatData) {
        console.error('Seat data not found for:', seat.id)
        continue
      }
      
      const ticketNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      
      // Генерируем QR код данные (сохраняем только JSON, не Data URL)
      const qrData = JSON.stringify({
        orderId,
        seatId: seat.id,
        eventId,
        type: 'invitation',
        ticketNumber
      })

      ticketsData.push({
        order_id: orderId,
        event_id: eventId,
        seat_id: seat.id,
        ticket_number: ticketNumber,
        qr_code: qrData,
        status: 'valid'
      })
    }

    const { error: ticketsError } = await supabase
      .from('tickets')
      .insert(ticketsData)

    if (ticketsError) {
      console.error('Error creating tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Ошибка создания билетов' },
        { status: 500 }
      )
    }

    // Создаем запись о "платеже" (для совместимости)
    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert({
        order_id: orderId,
        amount: 0,
        payment_method: 'invitation',
        payment_provider: 'admin',
        status: 'completed',
        provider_payment_id: `invitation-${orderId}`,
        provider_data: {
          type: 'invitation',
          createdBy: 'admin',
          recipient: body.recipient
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      // Не возвращаем ошибку, так как это не критично
    }

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Пригласительные билеты успешно созданы',
      tickets: ticketsData.length,
      seats: seatIds
    })

  } catch (error) {
    // Error in invitation creation
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}