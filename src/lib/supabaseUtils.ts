// Утилиты для работы с данными Supabase

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

interface ZoneTemplate {
  zone_id: string
  rows: string[]
  seats_per_row: number
  start_x: number
  start_y: number
  seat_spacing_x: number
  seat_spacing_y: number
}

// Кэш для данных
let zonesCache: ZoneTemplate[] | null = null
let seatsCache: Map<string, SeatData[]> = new Map()
let pricingCache: Map<string, Record<string, number>> = new Map()

// Получение всех зон
export async function getZones(): Promise<ZoneTemplate[]> {
  if (zonesCache) {
    return zonesCache
  }

  try {
    const response = await fetch('/api/zones')
    if (!response.ok) {
      throw new Error('Failed to fetch zones')
    }
    const data = await response.json()
    zonesCache = data.zones
    return data.zones
  } catch (error) {
    console.error('Error fetching zones:', error)
    return []
  }
}

// Получение мест для зоны
export async function getZoneSeats(zoneId: string): Promise<SeatData[]> {
  if (seatsCache.has(zoneId)) {
    return seatsCache.get(zoneId)!
  }

  try {
    const response = await fetch(`/api/zones/${zoneId}/seats`)
    if (!response.ok) {
      throw new Error(`Failed to fetch seats for zone ${zoneId}`)
    }
    const data = await response.json()
    seatsCache.set(zoneId, data.seats)
    return data.seats
  } catch (error) {
    console.error(`Error fetching seats for zone ${zoneId}:`, error)
    return []
  }
}

// Получение цен для события
export async function getEventPricing(eventId: string): Promise<Record<string, number>> {
  if (pricingCache.has(eventId)) {
    return pricingCache.get(eventId)!
  }

  try {
    const response = await fetch(`/api/events/${eventId}/pricing`)
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing for event ${eventId}`)
    }
    const data = await response.json()
    pricingCache.set(eventId, data.zonePrices)
    return data.zonePrices
  } catch (error) {
    console.error(`Error fetching pricing for event ${eventId}:`, error)
    return {}
  }
}

// Создание lookup объекта для мест (аналог seatLookup из utils.ts)
export function createSeatLookup(seats: SeatData[]): Record<string, { row: string; number: string; price: number }> {
  const lookup: Record<string, { row: string; number: string; price: number }> = {}
  
  seats.forEach(seat => {
    lookup[seat.id] = {
      row: seat.row,
      number: seat.number,
      price: seat.price
    }
  })
  
  return lookup
}

// Генерация мест из шаблона зоны
export function generateSeatsFromTemplate(template: ZoneTemplate): SeatData[] {
  const seats: SeatData[] = []
  
  template.rows.forEach((rowName, rowIndex) => {
    for (let seatNum = 1; seatNum <= template.seats_per_row; seatNum++) {
      const seatId = `${template.zone_id}-${rowName}-${seatNum.toString().padStart(2, '0')}`
      
      seats.push({
        id: seatId,
        row: rowName,
        number: seatNum.toString().padStart(2, '0'),
        x: template.start_x + (seatNum - 1) * template.seat_spacing_x,
        y: template.start_y + rowIndex * template.seat_spacing_y,
        status: 'available',
        price: 0, // Будет установлена из pricing API
        fill: getZoneColor(template.zone_id)
      })
    }
  })
  
  return seats
}

// Генерация цвета зоны на основе ID (совместимо с существующей системой)
export function getZoneColor(zoneId: string): string {
  const zoneColors: Record<string, string> = {
    '201': '#179240', // green-500
    '202': '#8526d9', // purple-500
    '203': '#921792', // pink-500
    '204': '#921792', // green-500
    '205': '#e7cb14', // yellow-500
    '206': '#ea3446', // blue-500
    '207': '#ea3446', // violet-500
    '208': '#ea3446', // pink-500
    '209': '#e7cb14', // amber-500
    '210': '#921792', // emerald-500
    '211': '#921792', // indigo-500
    '212': '#8526d9', // lime-500
    '213': '#179240', // rose-500
  }
  
  return zoneColors[zoneId] || '#6b7280' // gray-500 as fallback
}

// Очистка кэша
export function clearCache() {
  zonesCache = null
  seatsCache.clear()
  pricingCache.clear()
}

// Предзагрузка данных для события
export async function preloadEventData(eventId: string) {
  try {
    // Загружаем зоны и цены параллельно
    const [zones, pricing] = await Promise.all([
      getZones(),
      getEventPricing(eventId)
    ])
    
    // Предзагружаем места для всех зон
    const seatPromises = zones.map(zone => getZoneSeats(zone.zone_id))
    await Promise.all(seatPromises)
    
    console.log(`Preloaded data for event ${eventId}: ${zones.length} zones`)
  } catch (error) {
    console.error(`Error preloading data for event ${eventId}:`, error)
  }
}

// Валидация данных места
export function validateSeatData(seat: any): seat is SeatData {
  return (
    typeof seat.id === 'string' &&
    typeof seat.row === 'string' &&
    typeof seat.number === 'string' &&
    typeof seat.x === 'number' &&
    typeof seat.y === 'number' &&
    ['available', 'unavailable', 'selected'].includes(seat.status) &&
    typeof seat.price === 'number' &&
    typeof seat.fill === 'string'
  )
}