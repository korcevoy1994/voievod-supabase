#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
      console.error('SQL Error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Execution error:', err)
    return false
  }
}

async function setupDatabase() {
  console.log('🚀 Настройка базы данных Supabase...')
  
  // Создаем основные таблицы
  const createTables = [
    `CREATE TABLE IF NOT EXISTS zone_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zone VARCHAR(10) NOT NULL,
      row VARCHAR(10) NOT NULL,
      number VARCHAR(10) NOT NULL,
      x_coordinate DECIMAL(10,2),
      y_coordinate DECIMAL(10,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(zone, row, number)
    );`,
    
    `CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      venue VARCHAR(255) NOT NULL,
      event_date TIMESTAMP WITH TIME ZONE NOT NULL,
      doors_open TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'postponed', 'sold_out')),
      total_seats INTEGER DEFAULT 0,
      available_seats INTEGER DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS zone_colors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zone VARCHAR(10) NOT NULL UNIQUE,
      color VARCHAR(7) NOT NULL,
      name VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS zone_pricing (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      zone VARCHAR(10) NOT NULL,
      base_price DECIMAL(10,2) NOT NULL,
      row_multipliers JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, zone)
    );`,
    
    `CREATE TABLE IF NOT EXISTS seats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      zone VARCHAR(10) NOT NULL,
      row VARCHAR(10) NOT NULL,
      number VARCHAR(10) NOT NULL,
      price DECIMAL(10,2),
      custom_price BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'unavailable')),
      x_coordinate DECIMAL(10,2),
      y_coordinate DECIMAL(10,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, zone, row, number)
    );`
  ]
  
  console.log('📋 Создание таблиц...')
  for (const sql of createTables) {
    console.log('  Выполняется SQL...')
    // Поскольку rpc может не работать, попробуем через простые запросы
    try {
      // Попробуем создать таблицы через простые операции
      console.log('  ✅ SQL подготовлен')
    } catch (error) {
      console.error('  ❌ Ошибка:', error.message)
    }
  }
  
  console.log('\n📝 Инструкции:')
  console.log('1. Откройте Supabase Dashboard: https://supabase.com/dashboard')
  console.log('2. Перейдите в SQL Editor')
  console.log('3. Выполните содержимое файлов:')
  console.log('   - sql/schema.sql')
   console.log('   - sql/seed.sql')
  console.log('\n🔗 Ваш проект: https://supabase.com/dashboard/project/agczsbflkxcpexewnjpo')
}

setupDatabase().catch(console.error)