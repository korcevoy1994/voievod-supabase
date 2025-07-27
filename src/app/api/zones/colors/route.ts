import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Получаем цвета всех зон
    const { data: colors, error } = await supabase
      .from('zone_colors')
      .select(`
        zone,
        color,
        name
      `)
      .order('zone')

    if (error) {
      console.error('Error fetching zone colors:', error)
      return NextResponse.json({ error: 'Failed to fetch zone colors' }, { status: 500 })
    }

    // Преобразуем в формат объекта для удобства использования
    const zoneColors: Record<string, string> = {}
    colors?.forEach(item => {
      zoneColors[item.zone] = item.color
    })

    return NextResponse.json({ 
      zoneColors,
      detailedColors: colors 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { zone, color, name } = await request.json()

    if (!zone || !color) {
      return NextResponse.json({ error: 'Zone and color are required' }, { status: 400 })
    }

    // Обновляем цвет зоны
    const { data, error } = await supabase
      .from('zone_colors')
      .upsert({
        zone,
        color,
        name: name || null
      })
      .select()

    if (error) {
      console.error('Error updating zone color:', error)
      return NextResponse.json({ error: 'Failed to update zone color' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}