import { useState, useEffect, useCallback, useRef } from 'react'

interface SeatData {
  id: string // Теперь короткий 8-символьный ID
  row: string
  number: string
  x: number
  y: number
  status: 'available' | 'unavailable' | 'selected' | 'reserved' | 'sold' | 'blocked'
  price: number
  fill: string
}

interface ZoneData {
  zone_id: string
  rows: string[]
  seats_per_row: number
  start_x: number
  start_y: number
  seat_spacing_x: number
  seat_spacing_y: number
}

interface EventData {
  id: string
  name: string
  description: string
  event_date: string
  venue: string
  total_seats: number
  available_seats: number
  status: string
}

// Глобальный кэш для данных
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private pendingRequests = new Map<string, Promise<any>>()

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  set<T>(key: string, data: T, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = 30000): Promise<T> {
    // Проверяем кэш
    const cached = this.get<T>(key)
    if (cached) return cached

    // Проверяем pending запросы
    const pending = this.pendingRequests.get(key)
    if (pending) return pending

    // Создаем новый запрос
    const request = fetcher().then(data => {
      this.set(key, data, ttl)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      throw error
    })

    this.pendingRequests.set(key, request)
    return request
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
    this.pendingRequests.delete(key)
  }
}

const globalCache = new DataCache()

// Хук для получения данных о зонах с кэшированием
export function useZones(eventId: string = '550e8400-e29b-41d4-a716-446655440000') {
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    async function fetchZones() {
      try {
        const data = await globalCache.getOrFetch(
          'zones',
          async () => {
            const response = await fetch('/api/zones')
            if (!response.ok) {
              throw new Error('Failed to fetch zones')
            }
            const result = await response.json()
            return result.data?.zones || result.zones || []
          },
          60000 // 1 минута кэш
        )
        
        if (mountedRef.current) {
          setZones(data)
          setError(null)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchZones()
    
    return () => {
      mountedRef.current = false
    }
  }, [])

  return { zones, loading, error }
}

// Хук для получения мест конкретной зоны с кэшированием и предзагрузкой
export function useZoneSeats(zoneId: string | null, eventId: string = '550e8400-e29b-41d4-a716-446655440000') {
  const [seats, setSeats] = useState<SeatData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Функция для предзагрузки соседних зон
  const preloadAdjacentZones = useCallback(async (currentZoneId: string) => {
    const zones = globalCache.get<ZoneData[]>('zones')
    if (!zones) return

    const currentIndex = zones.findIndex(z => z.zone_id === currentZoneId)
    if (currentIndex === -1) return

    const adjacentZones = [
      zones[currentIndex - 1]?.zone_id,
      zones[currentIndex + 1]?.zone_id
    ].filter(Boolean)

    // Предзагружаем соседние зоны с задержкой
    preloadTimeoutRef.current = setTimeout(() => {
      adjacentZones.forEach(zoneId => {
        globalCache.getOrFetch(
          `seats-${zoneId}-${eventId}`,
          async () => {
            const response = await fetch(`/api/zones/${zoneId}/seats?eventId=${eventId}`)
            if (!response.ok) throw new Error('Failed to preload seats')
            const result = await response.json()
            return result.seats
          },
          30000 // 30 секунд кэш для предзагруженных данных
        ).catch(() => {}) // Игнорируем ошибки предзагрузки
      })
    }, 500) // Задержка 500мс для предзагрузки
  }, [])

  useEffect(() => {
    mountedRef.current = true
    
    if (!zoneId) {
      setSeats([])
      setLoading(false)
      return () => {}
    }

    async function fetchSeats() {
      setLoading(true)
      try {
        const data = await globalCache.getOrFetch(
          `seats-${zoneId}-${eventId}`,
          async () => {
            const response = await fetch(`/api/zones/${zoneId}/seats?eventId=${eventId}`)
            if (!response.ok) {
              throw new Error('Failed to fetch seats')
            }
            const result = await response.json()
            return result.seats
          },
          45000 // 45 секунд кэш
        )
        
        if (mountedRef.current) {
          setSeats(data)
          setError(null)
          
          // Запускаем предзагрузку соседних зон
           preloadAdjacentZones(zoneId as string)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchSeats()
    
    return () => {
      mountedRef.current = false
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [zoneId, preloadAdjacentZones])

  return { seats, loading, error }
}

// Хук для получения цен события с кэшированием
export function useEventPricing(eventId: string) {
  const [zonePrices, setZonePrices] = useState<Record<string, number>>({})
  const [detailedPricing, setDetailedPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    async function fetchPricing() {
      try {
        const data = await globalCache.getOrFetch(
          `pricing-${eventId}`,
          async () => {
            const response = await fetch(`/api/events/${eventId}/pricing`)
            if (!response.ok) {
              throw new Error('Failed to fetch pricing')
            }
            return await response.json()
          },
          120000 // 2 минуты кэш для цен
        )
        
        if (mountedRef.current) {
          setZonePrices(data.zonePrices)
          setDetailedPricing(data.detailedPricing)
          setError(null)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchPricing()
    
    return () => {
      mountedRef.current = false
    }
  }, [eventId])

  return { zonePrices, detailedPricing, loading, error }
}

// Хук для получения информации о событии
export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvent() {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch event')
        }
        const data = await response.json()
        setEvent(data.event)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  return { event, loading, error }
}

// Хук для получения цветов зон
export function useZoneColors() {
  const [zoneColors, setZoneColors] = useState<Record<string, string>>({})
  const [detailedColors, setDetailedColors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchColors() {
      try {
        const response = await fetch('/api/zones/colors')
        if (!response.ok) {
          throw new Error('Failed to fetch zone colors')
        }
        const data = await response.json()
        setZoneColors(data.zoneColors)
        setDetailedColors(data.detailedColors)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchColors()
  }, [])

  return { zoneColors, detailedColors, loading, error }
}

// Хук для обновления цвета зоны
export function useUpdateZoneColor() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateZoneColor = async (zone: string, color: string, name?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/zones/colors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zone, color, name }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update zone color')
      }
      
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateZoneColor, loading, error }
}

// Хук для вычисления цены места с учетом ряда
export function useSeatPrice(zoneId: string, row: string, eventId: string) {
  const [price, setPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function calculatePrice() {
      try {
        // Можно создать отдельный API endpoint для вычисления цены места
        // или использовать функцию get_seat_price из базы данных
        const response = await fetch(`/api/events/${eventId}/pricing`)
        if (!response.ok) {
          throw new Error('Failed to fetch pricing')
        }
        const data = await response.json()
        
        const zonePricing = data.detailedPricing.find((p: any) => p.zone === zoneId)
        if (zonePricing) {
          // Простое вычисление: базовая цена * множитель ряда
          // В реальности можно использовать функцию calculate_seat_price из БД
          const rowMultipliers = zonePricing.row_multipliers || {}
          const multiplier = rowMultipliers[row] || 1
          const calculatedPrice = zonePricing.base_price * multiplier
          setPrice(calculatedPrice)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (zoneId && row && eventId) {
      calculatePrice()
    }
  }, [zoneId, row, eventId])

  return { price, loading, error }
}