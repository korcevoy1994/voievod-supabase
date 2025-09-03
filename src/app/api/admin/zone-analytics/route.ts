import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseBrowserSSRClient } from '@/lib/supabase-ssr'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'day' // day, week, month

    // Получаем статистику по зонам с пагинацией
    let allSeats: any[] = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('seats')
        .select(`
          zone,
          price,
          status
        `)
        .eq('event_id', eventId)
        .range(from, from + pageSize - 1)

      if (pageError) {
        console.error('Error fetching seats page:', pageError)
        return NextResponse.json({ error: 'Failed to fetch zone statistics' }, { status: 500 })
      }

      if (pageData && pageData.length > 0) {
        allSeats = allSeats.concat(pageData)
        from += pageSize
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }

    const zoneStats = allSeats
    const zoneError = null

    if (zoneError) {
      console.error('Error fetching zone stats:', zoneError)
      return NextResponse.json({ error: 'Failed to fetch zone statistics' }, { status: 500 })
    }

    // Отладочная информация (можно убрать в продакшене)
    // console.log('Total seats fetched:', zoneStats?.length)

    // Получаем данные о продажах по периодам
    const { data: salesData, error: salesError } = await supabase
      .from('orders')
      .select(`
        id,
        total_price,
        status,
        created_at
      `)
      .in('status', ['paid', 'confirmed'])

    if (salesError) {
      console.error('Error fetching sales data:', salesError)
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
    }

    // Обрабатываем статистику по зонам (упрощенная версия)
    const zoneAnalytics = zoneStats?.reduce((acc, seat) => {
      const zone = seat.zone
      if (!acc[zone]) {
        acc[zone] = {
          zone,
          totalSeats: 0,
          availableSeats: 0,
          bookedSeats: 0,
          soldSeats: 0,
          blockedSeats: 0,
          revenue: 0,
          averagePrice: 0,
          occupancyRate: 0
        }
      }

      acc[zone].totalSeats++
      
      // Подсчитываем статусы мест
      if (seat.status === 'blocked' || seat.status === 'unavailable') {
        acc[zone].blockedSeats++
      } else if (seat.status === 'sold') {
        acc[zone].soldSeats++
        acc[zone].revenue += seat.price
      } else if (seat.status === 'reserved' || seat.status === 'pending_payment') {
        acc[zone].bookedSeats++
      } else {
        acc[zone].availableSeats++
      }

      return acc
    }, {} as Record<string, any>) || {}

    // Вычисляем дополнительные метрики для зон
    Object.values(zoneAnalytics).forEach((zone: any) => {
      const occupiedSeats = zone.soldSeats + zone.bookedSeats
      zone.occupancyRate = zone.totalSeats > 0 ? (occupiedSeats / zone.totalSeats) * 100 : 0
      zone.averagePrice = zone.soldSeats > 0 ? zone.revenue / zone.soldSeats : 0
    })

    // Обрабатываем данные продаж по периодам (упрощенная версия)
    const periodData = salesData?.reduce((acc, order) => {
      const date = new Date(order.created_at)
      let periodKey: string

      switch (period) {
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default: // day
          periodKey = date.toISOString().split('T')[0]
      }

      if (!acc[periodKey]) {
        acc[periodKey] = {
          period: periodKey,
          orders: 0,
          revenue: 0,
          tickets: 0
        }
      }

      acc[periodKey].orders++
      acc[periodKey].revenue += order.total_price || 0
      acc[periodKey].tickets += 1 // Упрощенно считаем 1 билет на заказ

      return acc
    }, {} as Record<string, any>) || {}

    // Сортируем периоды по дате
    const sortedPeriods = Object.values(periodData).sort((a: any, b: any) => 
      new Date(a.period).getTime() - new Date(b.period).getTime()
    )

    // Топ зоны по выручке
    const topZonesByRevenue = Object.values(zoneAnalytics)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)

    // Топ зоны по заполняемости
    const topZonesByOccupancy = Object.values(zoneAnalytics)
      .sort((a: any, b: any) => b.occupancyRate - a.occupancyRate)
      .slice(0, 5)

    // Общая статистика
    const totalStats = Object.values(zoneAnalytics).reduce((acc: {
      totalSeats: number
      soldSeats: number
      bookedSeats: number
      revenue: number
      occupancyRate?: number
    }, zone: any) => {
      acc.totalSeats += zone.totalSeats
      acc.soldSeats += zone.soldSeats
      acc.bookedSeats += zone.bookedSeats
      acc.revenue += zone.revenue
      return acc
    }, { totalSeats: 0, soldSeats: 0, bookedSeats: 0, revenue: 0 })

    totalStats.occupancyRate = totalStats.totalSeats > 0 
      ? ((totalStats.soldSeats + totalStats.bookedSeats) / totalStats.totalSeats) * 100 
      : 0

    return NextResponse.json({
      zoneAnalytics: Object.values(zoneAnalytics),
      periodData: sortedPeriods,
      topZonesByRevenue,
      topZonesByOccupancy,
      totalStats,
      period,
      dateRange: { startDate, endDate }
    })

  } catch (error) {
    // Error in zone analytics API
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Получение детальной статистики по конкретной зоне
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { zone, eventId = '550e8400-e29b-41d4-a716-446655440000', startDate, endDate } = await request.json()

    if (!zone) {
      return NextResponse.json({ error: 'Zone is required' }, { status: 400 })
    }

    // Получаем детальную информацию о местах в зоне
    const { data: seatDetails, error: seatError } = await supabase
      .from('seats')
      .select(`
        id,
        row,
        number,
        price,
        status,
        order_seats!left(
          id,
          orders!inner(
            id,
            customer_first_name,
            customer_last_name,
            customer_email,
            status,
            created_at,
            total_price,
            events!inner(
              id
            )
          )
        ),
        booking_seats!left(
          id,
          bookings!inner(
            id,
            customer_name,
            customer_email,
            status,
            created_at,
            event_id
          )
        )
      `)
      .eq('zone', zone)

    if (seatError) {
      console.error('Error fetching seat details:', seatError)
      return NextResponse.json({ error: 'Failed to fetch seat details' }, { status: 500 })
    }

    // Получаем историю продаж по зоне
    let salesHistoryQuery = supabase
      .from('orders')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        total_price,
        status,
        created_at,
        order_seats!inner(
          seats!inner(
            zone,
            row,
            number,
            price
          )
        ),
        events!inner(
          id
        )
      `)
      .eq('events.id', eventId)
      .eq('order_seats.seats.zone', zone)
      .in('status', ['paid', 'confirmed'])
      .order('created_at', { ascending: false })

    if (startDate) {
      salesHistoryQuery = salesHistoryQuery.gte('created_at', startDate)
    }
    if (endDate) {
      salesHistoryQuery = salesHistoryQuery.lte('created_at', endDate)
    }

    const { data: salesHistory, error: salesHistoryError } = await salesHistoryQuery

    if (salesHistoryError) {
      console.error('Error fetching sales history:', salesHistoryError)
      return NextResponse.json({ error: 'Failed to fetch sales history' }, { status: 500 })
    }

    // Анализируем данные
    const zoneStats = {
      totalSeats: seatDetails?.length || 0,
      soldSeats: 0,
      bookedSeats: 0,
      availableSeats: 0,
      blockedSeats: 0,
      totalRevenue: 0,
      averagePrice: 0,
      priceRange: { min: Infinity, max: 0 }
    }

    const seatStatusDetails = seatDetails?.map(seat => {
      let seatStatus = 'available'
      let customerInfo = null
      let orderDate = null

      if (seat.status === 'blocked' || seat.status === 'unavailable') {
        seatStatus = 'blocked'
        zoneStats.blockedSeats++
      } else if (seat.order_seats && seat.order_seats.length > 0) {
        seatStatus = 'sold'
        zoneStats.soldSeats++
        zoneStats.totalRevenue += seat.price
        const order = seat.order_seats[0].orders[0]
        customerInfo = {
          name: `${order.customer_first_name} ${order.customer_last_name}`,
          email: order.customer_email
        }
        orderDate = order.created_at
      } else if (seat.booking_seats && seat.booking_seats.length > 0) {
        seatStatus = 'booked'
        zoneStats.bookedSeats++
        const booking = seat.booking_seats[0].bookings[0]
        customerInfo = {
          name: booking.customer_name,
          email: booking.customer_email
        }
        orderDate = booking.created_at
      } else {
        zoneStats.availableSeats++
      }

      // Обновляем диапазон цен
      if (seat.price < zoneStats.priceRange.min) zoneStats.priceRange.min = seat.price
      if (seat.price > zoneStats.priceRange.max) zoneStats.priceRange.max = seat.price

      return {
        ...seat,
        status: seatStatus,
        customerInfo,
        orderDate
      }
    }) || []

    zoneStats.averagePrice = zoneStats.soldSeats > 0 ? zoneStats.totalRevenue / zoneStats.soldSeats : 0
    if (zoneStats.priceRange.min === Infinity) zoneStats.priceRange.min = 0

    return NextResponse.json({
      zone,
      stats: zoneStats,
      seats: seatStatusDetails,
      salesHistory: salesHistory || [],
      dateRange: { startDate, endDate }
    })

  } catch (error) {
    console.error('Error in zone details API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}