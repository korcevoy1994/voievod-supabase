import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    // Проверяем подключение к базе данных
    const { error: connectionError } = await supabase
      .from('seats')
      .select('id')
      .limit(1)

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`)
    }

    // Для обновления constraint нужно использовать SQL напрямую
    // Поскольку Supabase не позволяет выполнять DDL через обычные методы,
    // нужно использовать SQL Editor в Supabase Dashboard
    
    return NextResponse.json({
      success: false,
      message: 'Constraint update requires manual SQL execution',
      instructions: [
        '1. Откройте Supabase Dashboard',
        '2. Перейдите в SQL Editor',
        '3. Выполните следующий SQL:',
        '',
        'ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;',
        '',
        "ALTER TABLE seats ADD CONSTRAINT seats_status_check CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'unavailable'));",
        '',
        '4. После выполнения статус \'unavailable\' будет доступен'
      ],
      sql: [
        'ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;',
        "ALTER TABLE seats ADD CONSTRAINT seats_status_check CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'unavailable'));"
      ]
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}