import { NextRequest, NextResponse } from 'next/server'
import { withProtectedAccess, withPublicAccess, validateRequestData, sanitizeInput } from '@/middleware/sessionMiddleware'
import { SecureSessionManager } from '@/lib/secureSessionManager'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'


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

interface OrderVipTicket {
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
  vipTickets: OrderVipTicket[]
  totalPrice: number
  totalTickets: number
  paymentMethod: string
}

export const POST = withPublicAccess(async (request: NextRequest) => {
  try {

    const supabase = createSupabaseServerClient()
    const body: CreateOrderRequest = await request.json()

    
    const {
      userId,
      customerInfo,
      seats,
      generalAccess,
      vipTickets,
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
      logger.error('Ошибка валидации данных', validation.errors)
      return NextResponse.json(
        { error: 'Ошибка валидации данных', details: validation.errors },
        { status: 400 }
      )
    }


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
      logger.error('Error checking existing user', checkError);
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
        logger.error('Error updating existing user', updateError);
        return NextResponse.json(
          { error: 'Ошибка обновления пользователя', details: updateError.message },
          { status: 500 }
        );
      }
      
      // User updated successfully
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
        logger.error('Error creating new user', insertError);
        return NextResponse.json(
          { error: 'Ошибка создания пользователя', details: insertError.message },
          { status: 500 }
        );
      }
      
      // User created successfully
    }



    // Получаем ID события (предполагаем, что у нас одно активное событие)

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (eventError || !eventData) {
      logger.error('Ошибка получения события', eventError)

      const { data: allEvents } = await supabase.from('events').select('id, title, status')

      return NextResponse.json(
        { error: 'Событие не найдено' },
        { status: 500 }
      )
    }


    // Создаем заказ и получаем сгенерированный UUID
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: actualUserId,
        customer_email: sanitizedCustomerInfo.email,
        customer_first_name: sanitizedCustomerInfo.firstName,
        customer_last_name: sanitizedCustomerInfo.lastName,
        customer_phone: sanitizedCustomerInfo.phone,
        total_price: totalPrice,
        total_tickets: totalTickets,
        payment_method: paymentMethod,
        status: 'pending',
        event_id: eventData.id,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (orderError) {
      logger.error('Ошибка создания заказа', orderError)
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
      logger.error('Ошибка обновления QR кода и PDF URL', updateError)
    }

    // Сохраняем места в заказе
    if (seats.length > 0) {
      const orderSeats = []
      
      // Проверяем существование мест в базе данных
      for (const seat of seats) {
        const { data: seatData, error: seatError } = await supabase
          .from('seats')
          .select('id')
          .eq('id', seat.id)
          .single()
        
        if (seatError || !seatData) {
          logger.error(`Ошибка поиска места ${seat.id}`, seatError)
          // Откатываем заказ
          await supabase.from('orders').delete().eq('id', orderId)
          return NextResponse.json(
            { error: `Место ${seat.id} не найдено` },
            { status: 500 }
          )
        }
        
        orderSeats.push({
          order_id: orderId,
          seat_id: seat.id, // Используем TEXT ID из базы данных
          price: seat.price
        })
      }

      const { error: seatsError } = await supabase
        .from('order_seats')
        .insert(orderSeats)

      if (seatsError) {
        logger.error('Ошибка сохранения мест', seatsError)
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
      const orderGeneralAccess = generalAccess.map((ticket) => ({
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
        logger.error('Ошибка сохранения general access', generalError)
        // Откатываем заказ
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { error: 'Ошибка сохранения билетов' },
          { status: 500 }
        )
      }
    }

    // Сохраняем VIP билеты
    if (vipTickets && vipTickets.length > 0) {
      const orderVipTickets = vipTickets.map((ticket) => ({
        order_id: orderId,
        vip_zone_id: ticket.id,
        ticket_name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        event_id: eventData.id
      }))

      const { error: vipError } = await supabase
        .from('order_vip_tickets')
        .insert(orderVipTickets)

      if (vipError) {
        logger.error('Ошибка сохранения VIP билетов', vipError)
        // Откатываем заказ
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { error: 'Ошибка сохранения VIP билетов' },
          { status: 500 }
        )
      }
    }

    // Места остаются в статусе 'available' до успешной оплаты
    // Статус 'sold' будет установлен только после подтверждения платежа

    // Создаем билеты для заказа
    
    try {
      const ticketsToCreate = []

      // Создаем билеты для мест
      if (seats.length > 0) {
        for (let i = 0; i < seats.length; i++) {
          const seat = seats[i]
          
          // Получаем данные места из базы данных
          const { data: seatData, error: seatError } = await supabase
            .from('seats')
            .select('id, zone, row, number')
            .eq('id', seat.id)
            .single()

          if (seatError || !seatData) {
            logger.error(`Ошибка получения данных места ${seat.id}`, seatError)
            continue // Пропускаем это место, если не можем найти данные
          }

          const ticketNumber = `VOEV-${seatData.zone}-${seatData.row}-${seatData.number}-${Date.now()}-${i}`
          
          const metadata = {
            ticket_type: 'seat',
            seat_zone: seatData.zone,
            seat_row: seatData.row,
            seat_number: seatData.number,
            price: seat.price,
            holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
            holder_email: sanitizedCustomerInfo.email,
            holder_phone: sanitizedCustomerInfo.phone || null,
            order_number: orderNumber
          }
          
          const qrData = {
            ticket_number: ticketNumber,
            order_id: orderId,
            seat_zone: seatData.zone,
            seat_row: seatData.row,
            seat_number: seatData.number,
            holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
            event_id: eventData.id,
            timestamp: Date.now()
          }
          
          const qrCode = JSON.stringify(qrData)

          ticketsToCreate.push({
            order_id: orderId,
            event_id: eventData.id,
            ticket_number: ticketNumber,
            qr_code: qrCode,
            seat_id: seatData.id, // Используем реальный seat_id
            status: 'valid',
            metadata: JSON.stringify(metadata)
          })
        }
      }

      // Создаем билеты для general access
      if (generalAccess.length > 0) {
        for (const gaTicket of generalAccess) {
          for (let i = 0; i < gaTicket.quantity; i++) {
            const ticketNumber = `VOEV-GA-${gaTicket.name.replace(/\s+/g, '-')}-${Date.now()}-${i}`
            
            const metadata = {
              ticket_type: 'general_access',
              ticket_name: gaTicket.name,
              price: gaTicket.price,
              holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
              holder_email: sanitizedCustomerInfo.email,
              holder_phone: sanitizedCustomerInfo.phone || null,
              order_number: orderNumber
            }
            
            const qrData = {
              ticket_number: ticketNumber,
              order_id: orderId,
              ticket_type: 'general_access',
              ticket_name: gaTicket.name,
              holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
              event_id: eventData.id,
              timestamp: Date.now()
            }
            
            const qrCode = JSON.stringify(qrData)

            ticketsToCreate.push({
              order_id: orderId,
              event_id: eventData.id,
              ticket_number: ticketNumber,
              qr_code: qrCode,
              seat_id: null,
              status: 'valid',
              metadata: JSON.stringify(metadata)
            })
          }
        }
      }

      // Создаем билеты для VIP зон
      if (vipTickets && vipTickets.length > 0) {
        for (const vipTicket of vipTickets) {
          for (let i = 0; i < vipTicket.quantity; i++) {
            const ticketNumber = `VOEV-VIP-${vipTicket.name.replace(/\s+/g, '-')}-${Date.now()}-${i}`
            
            const metadata = {
              ticket_type: 'vip',
              ticket_name: vipTicket.name,
              price: vipTicket.price,
              holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
              holder_email: sanitizedCustomerInfo.email,
              holder_phone: sanitizedCustomerInfo.phone || null,
              order_number: orderNumber
            }
            
            const qrData = {
              ticket_number: ticketNumber,
              order_id: orderId,
              ticket_type: 'vip',
              ticket_name: vipTicket.name,
              holder_name: `${sanitizedCustomerInfo.firstName} ${sanitizedCustomerInfo.lastName}`,
              event_id: eventData.id,
              timestamp: Date.now()
            }
            
            const qrCode = JSON.stringify(qrData)

            ticketsToCreate.push({
              order_id: orderId,
              event_id: eventData.id,
              ticket_number: ticketNumber,
              qr_code: qrCode,
              seat_id: null,
              status: 'valid',
              metadata: JSON.stringify(metadata)
            })
          }
        }
      }

      if (ticketsToCreate.length > 0) {
        const { error: ticketsError } = await supabase
          .from('tickets')
          .insert(ticketsToCreate)

        if (ticketsError) {
          logger.error('Ошибка создания билетов', ticketsError)
        }
      }
    } catch (ticketError) {
      logger.error('Ошибка в процессе создания билетов', ticketError)
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
    logger.error('Критическая ошибка при создании заказа', error)
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
      logger.error('Ошибка получения заказов', error)
      return NextResponse.json(
        { error: 'Ошибка получения заказов' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })

  } catch (error) {
    logger.error('Ошибка при получении заказов', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
})