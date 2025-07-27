import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ZonePricing {
  zone: string
  base_price: number
  row_multipliers?: Record<string, number>
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    
    // Получаем ценообразование для события
    const { data: pricing, error } = await supabase
      .from('zone_prices')
      .select(`
        zone,
        base_price,
        row_multipliers
      `)
      .eq('event_id', eventId)
      .order('zone')

    if (error) {
      console.error('Error fetching pricing:', error)
      return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
    }

    // Преобразуем в формат объекта для совместимости с текущим кодом
    const zonePrices: Record<string, number> = {}
    pricing?.forEach((item: any) => {
      zonePrices[item.zone] = item.base_price
    })

    return NextResponse.json({ 
      zonePrices,
      detailedPricing: pricing 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { zone, basePrice, rowMultipliers } = await request.json()

    if (!zone || basePrice === undefined) {
      return NextResponse.json({ error: 'Zone and base price are required' }, { status: 400 })
    }

    // Обновляем или создаем ценообразование для зоны
    const { data, error } = await supabase
      .from('zone_prices')
      .upsert({
        event_id: eventId,
        zone,
        base_price: basePrice,
        row_multipliers: rowMultipliers || {}
      })
      .select()

    if (error) {
      console.error('Error updating zone pricing:', error)
      return NextResponse.json({ error: 'Failed to update zone pricing' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get('zone')

    if (!zone) {
      return NextResponse.json({ error: 'Zone parameter is required' }, { status: 400 })
    }

    // Удаляем ценообразование для зоны
    const { error } = await supabase
      .from('zone_prices')
      .delete()
      .eq('event_id', eventId)
      .eq('zone', zone)

    if (error) {
      console.error('Error deleting zone pricing:', error)
      return NextResponse.json({ error: 'Failed to delete zone pricing' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}