import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  try {
    const { zoneId } = await params
    
    // Получаем места для конкретной зоны
    const { data: seats, error } = await supabase
      .from('seats')
      .select(`
        id,
        zone,
        row,
        number,
        x_coordinate,
        y_coordinate,
        status,
        price,
        custom_price
      `)
      .eq('zone', zoneId)
      .order('row')
      .order('number')

    if (error) {
      console.error('Error fetching seats:', error)
      return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 })
    }

    // Получаем цвет зоны
    const zoneColor = await getZoneColor(zoneId)
    
    // Преобразуем данные в формат, совместимый с фронтендом
    const formattedSeats = seats?.map(seat => {
      // Правильная логика приоритета цен:
      // 1. Если custom_price = true, используем seat.price
      // 2. Иначе вычисляем цену через calculate_seat_price
      let finalPrice = seat.price || 0;
      
      // Если у места нет custom_price или custom_price = false,
      // цена должна быть уже правильно рассчитана триггерами
      // Но для надежности можем добавить дополнительную проверку
      
      return {
        id: `${seat.zone}-${seat.row}-${seat.number}`,
        row: seat.row,
        number: seat.number,
        x: seat.x_coordinate,
        y: seat.y_coordinate,
        status: seat.status,
        price: finalPrice,
        fill: zoneColor // Используем цвет зоны из БД
      };
    }) || []

    return NextResponse.json({ seats: formattedSeats })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Функция для получения цвета зоны из БД
async function getZoneColor(zoneId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('zone_colors')
      .select('color')
      .eq('zone', zoneId)
      .single()
    
    if (error || !data) {
      console.warn(`Zone color not found for zone ${zoneId}, using default`)
      return '#8525D9' // Цвет по умолчанию
    }
    
    return data.color
  } catch (error) {
    console.error('Error fetching zone color:', error)
    return '#8525D9' // Цвет по умолчанию
  }
}