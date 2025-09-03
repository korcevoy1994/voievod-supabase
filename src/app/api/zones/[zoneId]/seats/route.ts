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
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId') || '550e8400-e29b-41d4-a716-446655440000'
    
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
        .eq('event_id', eventId)
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
    
    // Получаем цену из zone_pricing для зоны
    const { data: zonePricing } = await supabase
      .from('zone_pricing')
      .select('price')
      .eq('event_id', eventId)
      .eq('zone', zoneId)
      .single()
    
    const zonePriceFromPricing = zonePricing?.price || 0
    
    // Преобразуем данные в формат, совместимый с фронтендом
    const formattedSeats = seatsResult.data?.map((seat: any) => {
      // Правильная логика приоритета цен:
      // 1. Если custom_price = true, используем seat.price
      // 2. Иначе используем цену из zone_pricing
      const finalPrice = seat.custom_price === true ? seat.price : zonePriceFromPricing
      
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