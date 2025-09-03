/**
 * Оптимизированные хуки для работы с данными с расширенным кэшированием
 */

import { useState, useEffect, useCallback } from 'react'
import { globalCache, CACHE_TTL } from '@/lib/cache/enhancedCache'
import { logger } from '@/lib/logger'

interface UseDataOptions {
  ttl?: number
  enabled?: boolean
  refetchOnMount?: boolean
  staleWhileRevalidate?: boolean
}

interface UseDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  invalidate: () => void
}

/**
 * Универсальный хук для работы с кэшированными данными
 */
export function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseDataOptions = {}
): UseDataResult<T> {
  const {
    ttl = CACHE_TTL.DYNAMIC,
    enabled = true,
    refetchOnMount = false,
    staleWhileRevalidate = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (useCache = true) => {
    if (!enabled) return

    try {
      setError(null)
      
      if (useCache) {
        // Проверяем кэш
        const cached = globalCache.get<T>(key)
        if (cached) {
          setData(cached)
          setLoading(false)
          
          // Если включен staleWhileRevalidate, обновляем в фоне
          if (staleWhileRevalidate) {
            fetchData(false).catch(err => {
              logger.warn(`Background refresh failed for ${key}:`, err)
            })
          }
          return
        }
      }

      setLoading(true)
      const result = await globalCache.getOrFetch(key, fetcher, ttl)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error(`Failed to fetch data for ${key}:`, err)
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl, enabled, staleWhileRevalidate])

  const refetch = useCallback(async () => {
    globalCache.invalidate(key)
    await fetchData(false)
  }, [key, fetchData])

  const invalidate = useCallback(() => {
    globalCache.invalidate(key)
    setData(null)
    setError(null)
  }, [key])

  useEffect(() => {
    if (enabled && (refetchOnMount || !data)) {
      fetchData()
    }
  }, [enabled, refetchOnMount, fetchData, data])

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  }
}

/**
 * Хук для получения зон с оптимизированным кэшированием
 */
export function useOptimizedZones() {
  return useOptimizedData(
    'zones',
    async () => {
      const response = await fetch('/api/zones')
      if (!response.ok) {
        throw new Error('Failed to fetch zones')
      }
      const result = await response.json()
      return result.data?.zones || result.zones || []
    },
    {
      ttl: CACHE_TTL.STATIC,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения цветов зон с оптимизированным кэшированием
 */
export function useOptimizedZoneColors() {
  return useOptimizedData(
    'zone_colors',
    async () => {
      const response = await fetch('/api/zones/colors')
      if (!response.ok) {
        throw new Error('Failed to fetch zone colors')
      }
      const result = await response.json()
      return result.data || result
    },
    {
      ttl: CACHE_TTL.STATIC,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения мест зоны с оптимизированным кэшированием
 */
export function useOptimizedZoneSeats(zoneId: string | null, eventId: string = '550e8400-e29b-41d4-a716-446655440000') {
  return useOptimizedData(
    `zone_seats_${zoneId}_${eventId}`,
    async () => {
      if (!zoneId) throw new Error('Zone ID is required')
      
      const response = await fetch(`/api/zones/${zoneId}/seats?eventId=${eventId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch zone seats')
      }
      const result = await response.json()
      return result.data || result
    },
    {
      ttl: CACHE_TTL.DYNAMIC,
      enabled: !!zoneId,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения событий с оптимизированным кэшированием
 */
export function useOptimizedEvents() {
  return useOptimizedData(
    'events',
    async () => {
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const result = await response.json()
      return result.data?.events || result.events || []
    },
    {
      ttl: CACHE_TTL.STATIC,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения конкретного события
 */
export function useOptimizedEvent(eventId: string) {
  return useOptimizedData(
    `event_${eventId}`,
    async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }
      const result = await response.json()
      return result.data || result
    },
    {
      ttl: CACHE_TTL.STATIC,
      enabled: !!eventId,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения ценообразования события
 */
export function useOptimizedEventPricing(eventId: string) {
  return useOptimizedData(
    `event_pricing_${eventId}`,
    async () => {
      const response = await fetch(`/api/events/${eventId}/pricing`)
      if (!response.ok) {
        throw new Error('Failed to fetch event pricing')
      }
      const result = await response.json()
      return result.data || result
    },
    {
      ttl: CACHE_TTL.STATIC,
      enabled: !!eventId,
      staleWhileRevalidate: true
    }
  )
}

/**
 * Хук для получения VIP зон с кэшированием
 */
export function useOptimizedVipZones(eventId: string = '550e8400-e29b-41d4-a716-446655440000') {
  return useOptimizedData(
    `vip-zones-${eventId}`,
    async () => {
      const response = await fetch(`/api/vip-zones?eventId=${eventId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch VIP zones')
      }
      return response.json()
    },
    { ttl: CACHE_TTL.DYNAMIC }
  )
}

/**
 * Хук для получения заказов пользователя
 */
export function useOptimizedUserOrders(userId: string) {
  return useOptimizedData(
    `user_orders_${userId}`,
    async () => {
      const response = await fetch(`/api/orders?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user orders')
      }
      const result = await response.json()
      return result.data || result
    },
    {
      ttl: CACHE_TTL.DYNAMIC,
      enabled: !!userId,
      refetchOnMount: true
    }
  )
}

/**
 * Хук для инвалидации связанных кэшей
 */
export function useCacheInvalidation() {
  const invalidateZoneData = useCallback((zoneId?: string) => {
    if (zoneId) {
      globalCache.invalidate(`zone_seats_${zoneId}_*`)
    } else {
      globalCache.invalidate('zone_seats_*')
    }
    globalCache.invalidate('zones')
  }, [])

  const invalidateEventData = useCallback((eventId?: string) => {
    if (eventId) {
      globalCache.invalidate(`event_${eventId}`)
      globalCache.invalidate(`event_pricing_${eventId}`)
      globalCache.invalidate(`zone_seats_*_${eventId}`)
    } else {
      globalCache.invalidate('events')
      globalCache.invalidate('event_*')
    }
  }, [])

  const invalidateUserData = useCallback((userId?: string) => {
    if (userId) {
      globalCache.invalidate(`user_orders_${userId}`)
    } else {
      globalCache.invalidate('user_orders_*')
    }
  }, [])

  const invalidateAll = useCallback(() => {
    globalCache.clear()
  }, [])

  return {
    invalidateZoneData,
    invalidateEventData,
    invalidateUserData,
    invalidateAll
  }
}

/**
 * Хук для получения статистики кэша (для отладки)
 */
export function useCacheStats() {
  const [stats, setStats] = useState(globalCache.getStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalCache.getStats())
    }, 5000) // Обновляем каждые 5 секунд

    return () => clearInterval(interval)
  }, [])

  return stats
}