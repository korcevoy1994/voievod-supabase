import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseBrowserSSRClient } from '@/lib/supabase-ssr'

// GET - получить все цены по зонам
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Получаем ценовые политики для зон
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*')
      .eq('event_id', eventId)
      .order('zone')

    if (zonePricingError) {
      console.error('Error fetching zone pricing:', zonePricingError)
      return NextResponse.json({ error: 'Failed to fetch zone pricing' }, { status: 500 })
    }

    // Получаем статистику по зонам
    const { data: zoneStats, error: zoneStatsError } = await supabase
      .from('seats')
      .select('zone, status, price')
      .eq('event_id', eventId)

    if (zoneStatsError) {
      console.error('Error fetching zone stats:', zoneStatsError)
      return NextResponse.json({ error: 'Failed to fetch zone stats' }, { status: 500 })
    }

    // Группируем статистику по зонам
    const zoneStatsMap = zoneStats.reduce((acc: any, seat: any) => {
      if (!acc[seat.zone]) {
        acc[seat.zone] = {
          total: 0,
          available: 0,
          sold: 0,
          reserved: 0,
          blocked: 0,
          revenue: 0
        }
      }
      
      acc[seat.zone].total++
      acc[seat.zone][seat.status]++
      
      if (seat.status === 'sold' && seat.price) {
        acc[seat.zone].revenue += parseFloat(seat.price)
      }
      
      return acc
    }, {})

    // Объединяем данные
    const result = zonePricing.map((zone: any) => ({
      ...zone,
      stats: zoneStatsMap[zone.zone] || {
        total: 0,
        available: 0,
        sold: 0,
        reserved: 0,
        blocked: 0,
        revenue: 0
      }
    }))

    return NextResponse.json({ zones: result })
  } catch (error) {
    console.error('Error in pricing API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - обновить цены по зонам
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const body = await request.json()
    const { eventId, updates } = body

    if (!eventId || !updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const update of updates) {
      const { zone, price, rowMultipliers } = update

      if (!zone || price === undefined) {
        errors.push({ zone, error: 'Zone and price are required' })
        continue
      }

      // Обновляем ценовую политику зоны
      const { data, error } = await supabase
        .from('zone_pricing')
        .upsert({
          event_id: eventId,
          zone,
          price: parseFloat(price),
          row_multipliers: rowMultipliers || {},
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error(`Error updating zone ${zone}:`, error)
        errors.push({ zone, error: error.message })
      } else {
        results.push({ zone, success: true, data })
        
        // Обновляем цены мест в этой зоне (если они не имеют индивидуальную цену)
        const { error: seatsError } = await supabase.rpc('update_zone_seat_prices', {
          p_event_id: eventId,
          p_zone: zone
        })
        
        if (seatsError) {
          console.error(`Error updating seat prices for zone ${zone}:`, seatsError)
        }
      }
    }

    return NextResponse.json({ 
      success: errors.length === 0,
      results,
      errors
    })
  } catch (error) {
    console.error('Error in pricing update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - создать акцию/скидку
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserSSRClient()
    const body = await request.json()
    const { eventId, promotion } = body

    if (!eventId || !promotion) {
      return NextResponse.json({ error: 'Event ID and promotion data are required' }, { status: 400 })
    }

    const { 
      name, 
      description, 
      discountType, // 'percentage' | 'fixed'
      discountValue,
      zones, // массив зон для применения
      startDate,
      endDate,
      isActive = true
    } = promotion

    // Создаем запись акции
    const { data: promotionData, error: promotionError } = await supabase
      .from('promotions')
      .insert({
        event_id: eventId,
        name,
        description,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        zones: zones || [],
        start_date: startDate,
        end_date: endDate,
        is_active: isActive
      })
      .select()
      .single()

    if (promotionError) {
      console.error('Error creating promotion:', promotionError)
      return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
    }

    return NextResponse.json({ promotion: promotionData })
  } catch (error) {
    console.error('Error in promotion creation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}