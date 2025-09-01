import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse'
import { logger } from '@/lib/logger'

export const GET = withErrorHandling(async (request: Request) => {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000' // default event ID
  
  // Сначала пытаемся получить информацию из таблицы vip_zones
  const { data: vipZonesData, error: vipZonesError } = await supabase
    .from('vip_zones')
    .select('zone, name, seat_count, price, color')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('zone')
  
  // Если таблица vip_zones не существует или пуста, используем zone_pricing
  const { data: vipPricing, error: pricingError } = await supabase
    .from('zone_pricing')
    .select('zone, price')
    .eq('event_id', eventId)
    .like('zone', 'vip%')
    .order('zone')
  
  if (pricingError) {
    logger.error('Failed to fetch VIP zone pricing:', pricingError)
    return createErrorResponse('Failed to fetch VIP zone pricing', 500, 'GET /api/vip-zones')
  }

  // Получаем информацию о местах для каждой VIP зоны
  const vipZones: Array<{
    zone: string;
    name: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
    bookedSeats: number;
    reservedSeats: number;
    isAvailable: boolean;
    isWholeZone: boolean;
    color?: string;
  }> = []
  
  // Используем данные из vip_zones, если доступны, иначе из zone_pricing
  const dataSource = vipZonesData && vipZonesData.length > 0 ? vipZonesData : vipPricing
  
  for (const zoneData of dataSource || []) {
    const zone = zoneData.zone
    const isFromVipZonesTable = 'seat_count' in zoneData
    
    // Если данные из таблицы vip_zones, используем seat_count, иначе считаем из seats
    let totalSeats: number
    let availableSeats: number
    let bookedSeats: number
    let reservedSeats: number
    
    if (isFromVipZonesTable) {
       totalSeats = (zoneData as any).seat_count || 0
      // Для данных из vip_zones все еще нужно проверить статус мест
      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('zone', zone)
      
      if (seatsError) {
        logger.error(`Failed to fetch seats for zone ${zone}:`, seatsError)
        continue
      }
      
      availableSeats = seats?.filter(seat => seat.status === 'available').length || 0
      bookedSeats = seats?.filter(seat => seat.status === 'booked').length || 0
      reservedSeats = seats?.filter(seat => seat.status === 'reserved').length || 0
    } else {
      // Для данных из zone_pricing считаем места из таблицы seats
      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('zone', zone)
      
      if (seatsError) {
        logger.error(`Failed to fetch seats for zone ${zone}:`, seatsError)
        continue
      }
      
      totalSeats = seats?.length || 0
      availableSeats = seats?.filter(seat => seat.status === 'available').length || 0
      bookedSeats = seats?.filter(seat => seat.status === 'booked').length || 0
      reservedSeats = seats?.filter(seat => seat.status === 'reserved').length || 0
    }
    
    vipZones.push({
      zone,
      name: isFromVipZonesTable ? (zoneData as any).name || `VIP ${zone.replace('vip', '')}` : `VIP ${zone.replace('vip', '')}`,
      price: parseInt(zoneData.price),
      totalSeats,
      availableSeats,
      bookedSeats,
      reservedSeats,
      isAvailable: bookedSeats === 0 && reservedSeats === 0, // VIP зона доступна если нет забронированных или купленных мест
      isWholeZone: true, // VIP зоны продаются целиком
      color: isFromVipZonesTable ? (zoneData as any).color : undefined
    })
  }

  // Получаем цвета для VIP зон
  const { data: zoneColors, error: colorsError } = await supabase
    .from('zone_colors')
    .select('zone, color')
    .like('zone', 'vip%')
  
  if (!colorsError && zoneColors) {
    // Добавляем цвета к VIP зонам
    vipZones.forEach(zone => {
      const colorData = zoneColors.find(c => c.zone === zone.zone)
      zone.color = colorData?.color || '#1B1792' // default VIP blue
    })
  }

  return createSuccessResponse({ 
    vipZones,
    eventId,
    totalVipZones: vipZones.length,
    totalVipSeats: vipZones.reduce((sum, zone) => sum + zone.totalSeats, 0),
    totalAvailableVipSeats: vipZones.reduce((sum, zone) => sum + zone.availableSeats, 0)
  })
}, 'GET /api/vip-zones')