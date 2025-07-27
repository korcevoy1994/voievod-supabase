import { useState, useEffect } from 'react'

interface SeatData {
  id: string
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

// Хук для получения данных о зонах
export function useZones() {
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchZones() {
      try {
        const response = await fetch('/api/zones')
        if (!response.ok) {
          throw new Error('Failed to fetch zones')
        }
        const data = await response.json()
        setZones(data.zones)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchZones()
  }, [])

  return { zones, loading, error }
}

// Хук для получения мест конкретной зоны
export function useZoneSeats(zoneId: string | null) {
  const [seats, setSeats] = useState<SeatData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!zoneId) {
      setSeats([])
      return
    }

    async function fetchSeats() {
      setLoading(true)
      try {
        const response = await fetch(`/api/zones/${zoneId}/seats`)
        if (!response.ok) {
          throw new Error('Failed to fetch seats')
        }
        const data = await response.json()
        setSeats(data.seats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSeats()
  }, [zoneId])

  return { seats, loading, error }
}

// Хук для получения цен события
export function useEventPricing(eventId: string) {
  const [zonePrices, setZonePrices] = useState<Record<string, number>>({})
  const [detailedPricing, setDetailedPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPricing() {
      try {
        const response = await fetch(`/api/events/${eventId}/pricing`)
        if (!response.ok) {
          throw new Error('Failed to fetch pricing')
        }
        const data = await response.json()
        setZonePrices(data.zonePrices)
        setDetailedPricing(data.detailedPricing)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPricing()
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