import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseBrowserSSRClient } from '@/lib/supabase-ssr'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000'

    // Получаем все места с их статусами
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select(`
        id,
        zone,
        row,
        number,
        price,
        x_coordinate,
        y_coordinate,
        status
      `)
      .order('zone')
      .order('row')
      .order('number')

    if (seatsError) {
      console.error('Error fetching seats:', seatsError)
      return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 })
    }

    // Получаем забронированные места для данного события
    const { data: bookedSeats, error: bookedError } = await supabase
      .from('booking_seats')
      .select(`
        seat_id,
        bookings!inner(
          status,
          event_id
        )
      `)
      .eq('bookings.event_id', eventId)
      .in('bookings.status', ['confirmed', 'pending'])

    if (bookedError) {
      console.error('Error fetching booked seats:', bookedError)
      return NextResponse.json({ error: 'Failed to fetch booked seats' }, { status: 500 })
    }

    // Получаем проданные места
    const { data: soldSeats, error: soldError } = await supabase
      .from('order_seats')
      .select(`
        seat_id,
        orders!inner(
          status,
          events!inner(
            id
          )
        )
      `)
      .eq('orders.events.id', eventId)
      .in('orders.status', ['paid', 'confirmed'])

    if (soldError) {
      console.error('Error fetching sold seats:', soldError)
      return NextResponse.json({ error: 'Failed to fetch sold seats' }, { status: 500 })
    }

    // Создаем множества для быстрого поиска
    const bookedSeatIds = new Set(bookedSeats?.map(bs => bs.seat_id) || [])
    const soldSeatIds = new Set(soldSeats?.map(ss => ss.seat_id) || [])

    // Группируем места по зонам и определяем статусы
    const venueMap = seats?.reduce((acc, seat) => {
      const zone = seat.zone
      if (!acc[zone]) {
        acc[zone] = {
          zone,
          seats: [],
          stats: {
            total: 0,
            available: 0,
            booked: 0,
            sold: 0,
            blocked: 0
          }
        }
      }

      // Определяем статус места
      let seatStatus = 'available'
      if (seat.status === 'blocked' || seat.status === 'unavailable') {
        seatStatus = 'blocked'
      } else if (soldSeatIds.has(seat.id)) {
        seatStatus = 'sold'
      } else if (bookedSeatIds.has(seat.id)) {
        seatStatus = 'booked'
      }

      const seatData = {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        price: seat.price,
        x: seat.x_coordinate,
        y: seat.y_coordinate,
        status: seatStatus
      }

      acc[zone].seats.push(seatData)
      acc[zone].stats.total++
      acc[zone].stats[seatStatus as keyof typeof acc[typeof zone]['stats']]++

      return acc
    }, {} as Record<string, any>) || {}

    // Общая статистика
    const totalStats = Object.values(venueMap).reduce((acc: any, zone: any) => {
      acc.total += zone.stats.total
      acc.available += zone.stats.available
      acc.booked += zone.stats.booked
      acc.sold += zone.stats.sold
      acc.blocked += zone.stats.blocked
      return acc
    }, { total: 0, available: 0, booked: 0, sold: 0, blocked: 0 })

    return NextResponse.json({
      venueMap,
      totalStats,
      zones: Object.keys(venueMap).sort()
    })

  } catch (error) {
    console.error('Error in venue map API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Обновление статуса места
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { seatId, status } = await request.json()

    if (!seatId || !status) {
      return NextResponse.json({ error: 'Missing seatId or status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('seats')
      .update({ status })
      .eq('id', seatId)
      .select()

    if (error) {
      console.error('Error updating seat status:', error)
      return NextResponse.json({ error: 'Failed to update seat status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, seat: data[0] })

  } catch (error) {
    console.error('Error in venue map PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Массовое обновление статусов мест
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { seatIds, status } = await request.json()

    if (!seatIds || !Array.isArray(seatIds) || !status) {
      return NextResponse.json({ error: 'Missing seatIds array or status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('seats')
      .update({ status })
      .in('id', seatIds)
      .select()

    if (error) {
      console.error('Error bulk updating seat status:', error)
      return NextResponse.json({ error: 'Failed to bulk update seat status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updatedSeats: data })

  } catch (error) {
    console.error('Error in venue map PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}