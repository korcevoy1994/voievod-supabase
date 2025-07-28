import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    // Получаем уникальные зоны из таблицы seats
    const { data: seatZones, error: seatsError } = await supabase
      .from('seats')
      .select('zone')
      .order('zone')
    
    if (seatsError) {
      console.error('Error fetching zones from seats:', seatsError)
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
    }

    // Получаем уникальные зоны
    const uniqueZones = [...new Set(seatZones?.map(seat => seat.zone) || [])]
    
    // Получаем цвета и названия зон
    const { data: zoneColors, error: colorsError } = await supabase
      .from('zone_colors')
      .select('zone, color, name')
    
    if (colorsError) {
      console.error('Error fetching zone colors:', colorsError)
    }

    // Формируем результат
    const zones = uniqueZones.map(zoneId => {
      const zoneColor = zoneColors?.find(zc => zc.zone === zoneId)
      return {
        zone_id: zoneId,
        id: zoneId, // для совместимости
        name: zoneColor?.name || `Зона ${zoneId}`,
        color: zoneColor?.color || '#8525D9'
      }
    })

    return NextResponse.json({ zones })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}