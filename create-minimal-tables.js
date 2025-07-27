#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createMinimalTables() {
  console.log('🚀 Создание минимальных таблиц в Supabase...')
  
  try {
    // Создаем минимальную таблицу events
    console.log('📋 Создание таблицы events...')
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Тестовое событие',
        description: 'Описание тестового события',
        venue: 'Тестовая площадка',
        event_date: new Date().toISOString(),
        status: 'active'
      })
      .select()
    
    if (eventError && eventError.code !== '23505') { // Игнорируем дубликаты
      console.log('⚠️  Таблица events может не существовать:', eventError.message)
    } else {
      console.log('✅ Таблица events готова')
    }

    // Создаем минимальную таблицу seats
    console.log('📋 Создание тестовых мест...')
    const testSeats = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        zone: '201',
        row: '1',
        number: '1',
        status: 'available',
        price: 1000,
        x_coordinate: 100,
        y_coordinate: 100
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        zone: '201',
        row: '1',
        number: '2',
        status: 'available',
        price: 1000,
        x_coordinate: 120,
        y_coordinate: 100
      }
    ]

    const { data: seatData, error: seatError } = await supabase
      .from('seats')
      .insert(testSeats)
      .select()
    
    if (seatError && seatError.code !== '23505') { // Игнорируем дубликаты
      console.log('⚠️  Таблица seats может не существовать:', seatError.message)
    } else {
      console.log('✅ Тестовые места созданы')
    }

    console.log('\n🎉 Минимальные таблицы готовы!')
    console.log('\n📝 Для полной настройки выполните:')
    console.log('1. Откройте Supabase Dashboard')
    console.log('2. Перейдите в SQL Editor')
    console.log('3. Выполните sql/schema.sql')
console.log('4. Выполните sql/seed.sql')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    console.log('\n💡 Возможные причины:')
    console.log('- Таблицы еще не созданы в Supabase')
    console.log('- Нужно выполнить SQL скрипты вручную')
    console.log('- Проверьте права доступа')
  }
}

createMinimalTables()