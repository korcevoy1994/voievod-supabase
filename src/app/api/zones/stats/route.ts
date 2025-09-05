import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse'

// Кеширование на 2 минуты для снижения нагрузки
export const revalidate = 120

// Кеш для хранения результатов
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 минуты

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000'

  // Проверяем кеш
  const cacheKey = `zone-stats-${eventId}`
  const cached = cache.get(cacheKey)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return createSuccessResponse(cached.data)
  }

  // Оптимизированный запрос с агрегацией на уровне БД
  const { data: seatsData, error: seatsError } = await supabase
    .from('seats')
    .select('zone, status')
    .eq('event_id', eventId)

  if (seatsError) {
    return createErrorResponse('Failed to fetch zone statistics', 500, 'GET /api/zones/stats')
  }

  // Группируем статистику по зонам
  const stats: Record<string, {
    total: number
    available: number
    sold: number
    unavailable: number
    blocked: number
    free: number
  }> = {}

  seatsData?.forEach(seat => {
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
    
    // Логика подсчета статусов мест
    switch (seat.status) {
      case 'blocked':
        stats[zone].blocked++
        break
      case 'unavailable':
        stats[zone].unavailable++
        break
      case 'sold':
        stats[zone].sold++
        break
      case 'reserved':
      case 'pending_payment':
        stats[zone].unavailable++
        break
      default:
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

  const result = { 
    eventId,
    zones: stats
  }

  // Сохраняем в кеш
  cache.set(cacheKey, { data: result, timestamp: now })
  
  // Очищаем старые записи из кеша
  if (cache.size > 100) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, 50)
    toDelete.forEach(([key]) => cache.delete(key))
  }

  return createSuccessResponse(result)
}, 'GET /api/zones/stats')