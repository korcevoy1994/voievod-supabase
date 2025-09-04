import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000'

  // Получаем статистику мест по зонам с пагинацией (как в аналитике)
  let allSeats: any[] = []
  let from = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from('seats')
      .select(`
        zone,
        status
      `)
      .eq('event_id', eventId)
      .range(from, from + pageSize - 1)

    if (pageError) {
      return createErrorResponse('Failed to fetch zone statistics', 500, 'GET /api/zones/stats')
    }

    if (pageData && pageData.length > 0) {
      allSeats = allSeats.concat(pageData)
      from += pageSize
      hasMore = pageData.length === pageSize
    } else {
      hasMore = false
    }
  }

  // Группируем статистику по зонам (используем ту же логику что и в аналитике)
  const stats: Record<string, {
    total: number
    available: number
    sold: number
    unavailable: number
    blocked: number
    free: number
  }> = {}

  allSeats?.forEach(seat => {
    const zone = seat.zone
    if (!stats[zone]) {
      stats[zone] = {
        total: 0,
        available: 0,
        sold: 0,
        unavailable: 0,
        blocked: 0,
        free: 0
      }
    }

    stats[zone].total++
    
    // Используем ту же логику подсчета что и в аналитике
    if (seat.status === 'blocked' || seat.status === 'unavailable') {
      if (seat.status === 'blocked') {
        stats[zone].blocked++
      } else {
        stats[zone].unavailable++
      }
    } else if (seat.status === 'sold') {
      stats[zone].sold++
    } else if (seat.status === 'reserved' || seat.status === 'pending_payment') {
      // В аналитике это считается как bookedSeats, но в нашем API мы не возвращаем booked
      // Пока считаем как unavailable для совместимости
      stats[zone].unavailable++
    } else {
      stats[zone].available++
    }
  })

  // Вычисляем количество свободных мест для каждой зоны
  Object.keys(stats).forEach(zone => {
    const zoneData = stats[zone]
    zoneData.free = zoneData.total - zoneData.sold - zoneData.unavailable - zoneData.blocked
  })

  // Debug для зоны 207
  if (stats['207']) {
    console.log('🏟️ Zone 207 stats from API:', {
      zone207: stats['207'],
      totalZones: Object.keys(stats).length,
      allZoneIds: Object.keys(stats).slice(0, 10) // Первые 10 зон
    })
  } else {
    console.log('⚠️ Zone 207 not found in stats. Available zones:', Object.keys(stats).slice(0, 10))
  }

  return createSuccessResponse({ 
    eventId,
    zones: stats
  })
}, 'GET /api/zones/stats')