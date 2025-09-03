import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  console.log('🔥 POST /api/admin/free-failed-seats called')
  try {
    const supabase = createSupabaseServerClient()
    
    // Найти все заказы с failed платежами, которые имеют заблокированные места
    const { data: ordersWithFailedPayments, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        order_payments(status),
        order_seats(id, seat_id),
        order_general_access(id)
      `)
      .eq('order_payments.status', 'failed')
    
    if (ordersError) {
      console.error('Error fetching orders with failed payments:', ordersError)
      return NextResponse.json(
        { error: 'Ошибка при поиске заказов с неудачными платежами' },
        { status: 500 }
      )
    }

    console.log('Found orders with failed payments:', ordersWithFailedPayments?.length || 0)
    console.log('Orders data:', JSON.stringify(ordersWithFailedPayments, null, 2))

    if (!ordersWithFailedPayments || ordersWithFailedPayments.length === 0) {
      return NextResponse.json({
        message: 'Не найдено заблокированных мест с неудачными платежами',
        freedSeats: 0,
        processedOrders: []
      })
    }

    let totalFreedSeats = 0
    const processedOrders = []

    // Обработать каждый заказ
    for (const order of ordersWithFailedPayments) {
      let freedSeatsForOrder = 0
      
      // Освободить обычные места
      if (order.order_seats && order.order_seats.length > 0) {
        const seatIds = order.order_seats.map((seat: any) => seat.seat_id)
        
        if (seatIds.length > 0) {
          // Освобождаем места со статусом pending_payment, reserved или sold
          const { data: updatedSeats, error: seatsUpdateError } = await supabase
            .from('seats')
            .update({ status: 'available', reserved_by: null, expires_at: null })
            .in('id', seatIds)
            .in('status', ['pending_payment', 'reserved', 'sold'])
            .select('id')
          
          if (!seatsUpdateError && updatedSeats) {
            freedSeatsForOrder += updatedSeats.length
          }
        }
      }
      
      // General access билеты не требуют освобождения мест
      // так как они не связаны с конкретными местами
      
      if (freedSeatsForOrder > 0) {
        totalFreedSeats += freedSeatsForOrder
        processedOrders.push({
          orderId: order.id,
          freedSeats: freedSeatsForOrder
        })
      }
    }

    return NextResponse.json({
      message: `Успешно освобождено ${totalFreedSeats} мест из ${processedOrders.length} заказов`,
      freedSeats: totalFreedSeats,
      processedOrders
    })
    
  } catch (error) {
    console.error('Error freeing failed seats:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET endpoint для проверки количества заблокированных мест с failed платежами
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Подсчитать количество заблокированных мест с failed платежами
    const { data: ordersWithFailedPayments, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        order_payments(status),
        order_seats(id, seat_id),
        order_general_access(id)
      `)
      .eq('order_payments.status', 'failed')
    
    if (ordersError) {
      console.error('Error fetching orders with failed payments:', ordersError)
      return NextResponse.json(
        { error: 'Ошибка при поиске заказов с неудачными платежами' },
        { status: 500 }
      )
    }

    let totalBlockedSeats = 0
    const ordersInfo = []

    if (ordersWithFailedPayments) {
      for (const order of ordersWithFailedPayments) {
        let blockedSeatsForOrder = 0
        
        // Проверить реальный статус мест в базе данных
        if (order.order_seats && order.order_seats.length > 0) {
          const seatIds = order.order_seats.map(seat => seat.seat_id)
          
          const { data: actualSeats, error: seatsError } = await supabase
             .from('seats')
             .select('id, status')
             .in('id', seatIds)
             .in('status', ['pending_payment', 'reserved', 'sold']) // Считаем заблокированные места
          
          if (!seatsError && actualSeats) {
            blockedSeatsForOrder = actualSeats.length
          }
        }
        
        // General access билеты не блокируют места
        // так как они не связаны с конкретными местами
        
        if (blockedSeatsForOrder > 0) {
          totalBlockedSeats += blockedSeatsForOrder
          ordersInfo.push({
            orderId: order.id,
            blockedSeats: blockedSeatsForOrder
          })
        }
      }
    }

    return NextResponse.json({
      totalBlockedSeats,
      ordersCount: ordersInfo.length,
      orders: ordersInfo
    })
    
  } catch (error) {
    console.error('Error checking failed seats:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}