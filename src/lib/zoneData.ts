// Централизованный файл для всех зональных данных
// Убирает дублирование 39 импортов в 3 файлах

export { zone201SeatData } from '@/data/zone-201-seats'
export { zone202SeatData } from '@/data/zone-202-seats'
export { zone203SeatData } from '@/data/zone-203-seats'
export { zone204SeatData } from '@/data/zone-204-seats'
export { zone205SeatData } from '@/data/zone-205-seats'
export { zone206SeatData } from '@/data/zone-206-seats'
export { zone207SeatData } from '@/data/zone-207-seats'
export { zone208SeatData } from '@/data/zone-208-seats'
export { zone209SeatData } from '@/data/zone-209-seats'
export { zone210SeatData } from '@/data/zone-210-seats'
export { zone211SeatData } from '@/data/zone-211-seats'
export { zone212SeatData } from '@/data/zone-212-seats'
export { zone213SeatData } from '@/data/zone-213-seats'
export { zoneSectorASeatData } from '@/data/zone-sector-a-seats'
export { zoneSectorBSeatData } from '@/data/zone-sector-b-seats'
export { zoneSectorCSeatData } from '@/data/zone-sector-c-seats'

import { zone201SeatData } from '@/data/zone-201-seats'
import { zone202SeatData } from '@/data/zone-202-seats'
import { zone203SeatData } from '@/data/zone-203-seats'
import { zone204SeatData } from '@/data/zone-204-seats'
import { zone205SeatData } from '@/data/zone-205-seats'
import { zone206SeatData } from '@/data/zone-206-seats'
import { zone207SeatData } from '@/data/zone-207-seats'
import { zone208SeatData } from '@/data/zone-208-seats'
import { zone209SeatData } from '@/data/zone-209-seats'
import { zone210SeatData } from '@/data/zone-210-seats'
import { zone211SeatData } from '@/data/zone-211-seats'
import { zone212SeatData } from '@/data/zone-212-seats'
import { zone213SeatData } from '@/data/zone-213-seats'
import { zoneSectorASeatData } from '@/data/zone-sector-a-seats'
import { zoneSectorBSeatData } from '@/data/zone-sector-b-seats'
import { zoneSectorCSeatData } from '@/data/zone-sector-c-seats'

// Создаем lookup объект для быстрого доступа к данным зон
export const ZONE_DATA_MAP = {
  '201': zone201SeatData,
  '202': zone202SeatData,
  '203': zone203SeatData,
  '204': zone204SeatData,
  '205': zone205SeatData,
  '206': zone206SeatData,
  '207': zone207SeatData,
  '208': zone208SeatData,
  '209': zone209SeatData,
  '210': zone210SeatData,
  '211': zone211SeatData,
  '212': zone212SeatData,
  '213': zone213SeatData,
  'A': zoneSectorASeatData,
  'B': zoneSectorBSeatData,
  'C': zoneSectorCSeatData,
} as const

// Функция для получения данных зоны (заменяет длинную цепочку условий)
export const getZoneData = (zoneId: string) => {
  return ZONE_DATA_MAP[zoneId as keyof typeof ZONE_DATA_MAP] || []
}

// Глобальный lookup для всех мест (перенесено из utils.ts)
export const seatLookup = Object.values(ZONE_DATA_MAP)
  .flat()
  .reduce(
    (lookup, seat) => {
      lookup[seat.id] = { row: seat.row, number: seat.number }
      return lookup
    },
    {} as Record<string, { row: string; number: string }>,
  )