import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { eventId } = await params
    
    // Получаем информацию о событии
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        venue,
        total_seats,
        available_seats,
        status
      `)
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}