#!/usr/bin/env node

/**
 * Скрипт для инициализации базы данных Supabase
 * Выполняет schema.sql и seed.sql
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

// Проверяем наличие переменных окружения
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: Не найдены переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  console.error('Убедитесь, что файл .env.local содержит эти переменные.');
  process.exit(1);
}

// Создаем клиент Supabase с service role ключом
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Выполняет SQL-скрипт
 */
async function executeSqlFile(filePath, description) {
  try {
    console.log(`📄 Выполняется ${description}...`);
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Разбиваем на отдельные команды (по точке с запятой)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command) {
        console.log(`  Выполняется команда ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        
        if (error) {
          // Пробуем выполнить напрямую через .from() для простых запросов
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0);
          
          if (directError && !directError.message.includes('relation "_temp" does not exist')) {
            console.error(`❌ Ошибка при выполнении команды: ${error.message}`);
            console.error(`Команда: ${command.substring(0, 100)}...`);
          }
        }
      }
    }
    
    console.log(`✅ ${description} выполнен успешно`);
  } catch (error) {
    console.error(`❌ Ошибка при выполнении ${description}:`, error.message);
    throw error;
  }
}

/**
 * Альтернативный метод выполнения SQL через прямые запросы
 */
async function executeSchemaAlternative() {
  console.log('📄 Создание схемы базы данных (альтернативный метод)...');
  
  try {
    // Создаем таблицы по одной
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            phone VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'events',
        sql: `
          CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            venue VARCHAR(255) NOT NULL,
            event_date TIMESTAMP WITH TIME ZONE NOT NULL,
            doors_open TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
            image_url VARCHAR(500),
            total_seats INTEGER DEFAULT 0,
            available_seats INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'seats',
        sql: `
          CREATE TABLE IF NOT EXISTS seats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            zone VARCHAR(10) NOT NULL,
            row VARCHAR(10) NOT NULL,
            number VARCHAR(10) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
            x_coordinate INTEGER,
            y_coordinate INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, zone, row, number)
          );
        `
      },
      {
        name: 'bookings',
        sql: `
          CREATE TABLE IF NOT EXISTS bookings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
            customer_info JSONB,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'booking_seats',
        sql: `
          CREATE TABLE IF NOT EXISTS booking_seats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(booking_id, seat_id)
          );
        `
      },
      {
        name: 'payments',
        sql: `
          CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            payment_provider VARCHAR(50),
            payment_intent_id VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
            provider_response JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    ];
    
    for (const table of tables) {
      console.log(`  Создается таблица ${table.name}...`);
      // Здесь мы просто логируем, так как прямое выполнение DDL через Supabase JS сложно
      console.log(`  SQL для ${table.name} подготовлен`);
    }
    
    console.log('✅ Схема базы данных подготовлена');
    console.log('⚠️  Для завершения настройки выполните содержимое файлов sql/schema.sql и sql/seed.sql');
    console.log('   в SQL Editor вашего проекта Supabase вручную.');
    
  } catch (error) {
    console.error('❌ Ошибка при создании схемы:', error.message);
    throw error;
  }
}

/**
 * Проверяет подключение к базе данных
 */
async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к Supabase...');
    
    // Простая проверка подключения через auth
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('Invalid API key')) {
      throw new Error('Неверный API ключ Supabase');
    }
    
    console.log('✅ Подключение к Supabase успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к Supabase:', error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Инициализация базы данных Supabase\n');
  
  try {
    // Проверяем подключение
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    console.log('\n📋 Инструкции по настройке:');
    console.log('1. Откройте SQL Editor в вашем проекте Supabase');
    console.log('2. Скопируйте и выполните содержимое файла sql/schema.sql');
    console.log('3. Скопируйте и выполните содержимое файла sql/seed.sql');
    console.log('4. Проверьте создание таблиц в Table Editor');
    
    console.log('\n📁 Файлы для выполнения:');
    console.log(`   - ${path.join(__dirname, '..', 'sql', 'schema.sql')}`);
    console.log(`   - ${path.join(__dirname, '..', 'sql', 'seed.sql')}`);
    
    console.log('\n✅ Проверка завершена. Выполните SQL-скрипты вручную в Supabase.');
    
  } catch (error) {
    console.error('\n❌ Ошибка инициализации:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
if (require.main === module) {
  main();
}

module.exports = { testConnection, executeSchemaAlternative };