import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Временное решение: возвращаем статические данные зон
    // TODO: После создания таблиц в Supabase заменить на запрос к БД
    const zones = [
      { id: '201', name: 'Зона 201', color: '#179240' },
      { id: '202', name: 'Зона 202', color: '#8526d9' },
      { id: '203', name: 'Зона 203', color: '#921792' },
      { id: '204', name: 'Зона 204', color: '#921792' },
      { id: '205', name: 'Зона 205', color: '#e7cb14' },
      { id: '206', name: 'Зона 206', color: '#ea3446' },
      { id: '207', name: 'Зона 207', color: '#ea3446' },
      { id: '208', name: 'Зона 208', color: '#ea3446' },
      { id: '209', name: 'Зона 209', color: '#e7cb14' },
      { id: '210', name: 'Зона 210', color: '#921792' },
      { id: '211', name: 'Зона 211', color: '#921792' },
      { id: '212', name: 'Зона 212', color: '#8526d9' },
      { id: '213', name: 'Зона 213', color: '#179240' }
    ]

    return NextResponse.json({ zones })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}