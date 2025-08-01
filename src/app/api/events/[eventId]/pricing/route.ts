import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface ZonePricing {
  zone: string
  price: number
  row_multipliers?: Record<string, number>
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { eventId } = await params
    
    // Получаем ценообразование для всех зон конкретного события
    const { data: pricing, error } = await supabase
      .from('zone_pricing')
      .select(`
        zone,
        price
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
      zonePrices[item.zone] = item.price
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
    const supabase = createSupabaseServerClient()
    const { eventId } = await params
    const { zone, price } = await request.json()

    if (!zone || price === undefined) {
      return NextResponse.json({ error: 'Zone and price are required' }, { status: 400 })
    }

    // Обновляем или создаем ценообразование для зоны
    const { data, error } = await supabase
      .from('zone_pricing')
      .upsert({
        event_id: eventId,
        zone,
        price: price
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
    const supabase = createSupabaseServerClient()
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get('zone')

    if (!zone) {
      return NextResponse.json({ error: 'Zone parameter is required' }, { status: 400 })
    }

    // Удаляем ценообразование для зоны конкретного события
    const { error } = await supabase
      .from('zone_pricing')
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