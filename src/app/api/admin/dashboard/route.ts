import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalTicketsSold: number
  conversionRate: number
  revenueGrowth: number
  ordersGrowth: number
  averageOrderValue: number
  topZones: Array<{
    zone: string
    revenue: number
    ticketsSold: number
    occupancyRate: number
  }>
  salesByPeriod: Array<{
    date: string
    revenue: number
    orders: number
    tickets: number
  }>
  paymentMethodStats: Array<{
    method: string
    count: number
    revenue: number
    percentage: number
  }>
  orderStatusStats: Array<{
    status: string
    count: number
    percentage: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    // Параметры для фильтрации по периоду
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Определяем даты для фильтрации
    let dateFilter = ''
    if (startDate && endDate) {
      dateFilter = `created_at.gte.${startDate},created_at.lte.${endDate}`
    } else {
      const now = new Date()
      let daysBack = 30
      
      switch (period) {
        case '7d': daysBack = 7; break
        case '30d': daysBack = 30; break
        case '90d': daysBack = 90; break
        case '1y': daysBack = 365; break
      }
      
      const startPeriod = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
      dateFilter = `created_at.gte.${startPeriod.toISOString()}`
    }

    // 1. Получаем основную статистику заказов
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        total_price,
        total_tickets,
        status,
        payment_method,
        created_at,
        order_payments(status, amount, payment_method),
        order_seats(seat_id, price, zone)
      `)
      .or(dateFilter ? dateFilter : 'created_at.gte.1970-01-01')

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 })
    }

    // 2. Получаем статистику по предыдущему периоду для сравнения
    const prevPeriodStart = new Date()
    prevPeriodStart.setDate(prevPeriodStart.getDate() - (period === '7d' ? 14 : period === '30d' ? 60 : period === '90d' ? 180 : 730))
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(currentPeriodStart.getDate() - (period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365))

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_price, status')
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', currentPeriodStart.toISOString())

    // 3. Получаем информацию о зонах и местах
    const { data: zoneData } = await supabase
      .from('zone_pricing')
      .select('zone, price')

    const { data: seatsData } = await supabase
      .from('seats')
      .select('zone, status, price')

    // Вычисляем статистику
    const paidOrders = orders?.filter(o => o.status === 'paid') || []
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total_price, 0)
    const totalOrders = orders?.length || 0
    const totalTicketsSold = paidOrders.reduce((sum, order) => sum + order.total_tickets, 0)
    
    // Статистика предыдущего периода
    const prevPaidOrders = prevOrders?.filter(o => o.status === 'paid') || []
    const prevRevenue = prevPaidOrders.reduce((sum, order) => sum + order.total_price, 0)
    const prevOrdersCount = prevOrders?.length || 0
    
    // Рост показателей
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersGrowth = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0
    
    // Конверсия (примерная, нужно добавить трекинг посещений)
    const conversionRate = totalOrders > 0 ? (paidOrders.length / totalOrders) * 100 : 0
    
    // Средний чек
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

    // Статистика по зонам
    const zoneStats = new Map()
    paidOrders.forEach(order => {
      if (order.order_seats) {
        order.order_seats.forEach(seat => {
          const zone = seat.zone
          if (!zoneStats.has(zone)) {
            zoneStats.set(zone, { revenue: 0, ticketsSold: 0 })
          }
          const stats = zoneStats.get(zone)
          stats.revenue += seat.price
          stats.ticketsSold += 1
        })
      }
    })

    // Получаем общее количество мест по зонам для расчета заполняемости
    const zoneTotals = new Map()
    seatsData?.forEach(seat => {
      if (!zoneTotals.has(seat.zone)) {
        zoneTotals.set(seat.zone, { total: 0, sold: 0 })
      }
      const total = zoneTotals.get(seat.zone)
      total.total += 1
      if (seat.status === 'sold') {
        total.sold += 1
      }
    })

    const topZones = Array.from(zoneStats.entries())
      .map(([zone, stats]) => {
        const zoneTotal = zoneTotals.get(zone) || { total: 1, sold: 0 }
        return {
          zone,
          revenue: stats.revenue,
          ticketsSold: stats.ticketsSold,
          occupancyRate: (zoneTotal.sold / zoneTotal.total) * 100
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Продажи по периодам (группировка по дням)
    const salesByPeriod: Array<{
      date: string
      revenue: number
      orders: number
      tickets: number
    }> = []
    const dailyStats = new Map<string, { revenue: number; orders: number; tickets: number }>()
    
    paidOrders.forEach(order => {
      const date = order.created_at.split('T')[0]
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { revenue: 0, orders: 0, tickets: 0 })
      }
      const dayStats = dailyStats.get(date)!
      dayStats.revenue += order.total_price
      dayStats.orders += 1
      dayStats.tickets += order.total_tickets
    })

    Array.from(dailyStats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, stats]) => {
        salesByPeriod.push({
          date,
          revenue: stats.revenue,
          orders: stats.orders,
          tickets: stats.tickets
        })
      })

    // Статистика по способам оплаты
    const paymentStats = new Map()
    paidOrders.forEach(order => {
      const method = order.payment_method || 'unknown'
      if (!paymentStats.has(method)) {
        paymentStats.set(method, { count: 0, revenue: 0 })
      }
      const stats = paymentStats.get(method)
      stats.count += 1
      stats.revenue += order.total_price
    })

    const paymentMethodStats = Array.from(paymentStats.entries())
      .map(([method, stats]) => ({
        method,
        count: stats.count,
        revenue: stats.revenue,
        percentage: (stats.count / paidOrders.length) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Статистика по статусам заказов
    const statusStats = new Map()
    orders?.forEach(order => {
      const status = order.status
      statusStats.set(status, (statusStats.get(status) || 0) + 1)
    })

    const orderStatusStats = Array.from(statusStats.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / totalOrders) * 100
      }))
      .sort((a, b) => b.count - a.count)

    const dashboardStats: DashboardStats = {
      totalRevenue,
      totalOrders,
      totalTicketsSold,
      conversionRate,
      revenueGrowth,
      ordersGrowth,
      averageOrderValue,
      topZones,
      salesByPeriod,
      paymentMethodStats,
      orderStatusStats
    }

    return NextResponse.json(dashboardStats)

  } catch (error) {
    // Error in dashboard API
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}