import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { zoneId } = await params
    
    // Оптимизированный запрос: получаем места и цвет зоны одним запросом
    const [seatsResult, colorResult] = await Promise.all([
      supabase
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
        .order('number'),
      supabase
        .from('zone_colors')
        .select('color')
        .eq('zone', zoneId)
        .single()
    ])

    if (seatsResult.error) {
      logger.error('Error fetching seats', seatsResult.error)
      return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 })
    }

    // Получаем цвет зоны из результата запроса
    const zoneColor = colorResult.data?.color || '#8525D9'
    
    // Преобразуем данные в формат, совместимый с фронтендом
    const formattedSeats = seatsResult.data?.map((seat: any) => {
      // Правильная логика приоритета цен:
      // 1. Если custom_price = true, используем seat.price
      // 2. Иначе вычисляем цену через calculate_seat_price
      const finalPrice = seat.price || 0;
      
      // Если у места нет custom_price или custom_price = false,
      // цена должна быть уже правильно рассчитана триггерами
      // Но для надежности можем добавить дополнительную проверку
      
      return {
        id: seat.id, // Используем реальный ID из базы данных
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
    logger.error('Unexpected error in seats API', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Функция для получения цвета зоны из БД