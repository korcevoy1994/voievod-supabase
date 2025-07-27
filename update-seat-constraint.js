const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Выполняет SQL команду
 */
async function executeSql(command, description) {
  try {
    console.log(`📄 ${description}...`)
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: command })
    
    if (error) {
      console.error(`❌ Ошибка: ${error.message}`)
      return false
    }
    
    console.log(`✅ ${description} выполнено успешно`)
    return true
  } catch (error) {
    console.error(`❌ Ошибка при выполнении ${description}:`, error.message)
    return false
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Обновление constraint для статусов мест\n')
  
  try {
    // Проверяем подключение
    console.log('🔍 Проверка подключения к Supabase...')
    const { data, error } = await supabase.from('seats').select('id').limit(1)
    
    if (error) {
      throw new Error(`Ошибка подключения: ${error.message}`)
    }
    
    console.log('✅ Подключение к Supabase успешно\n')
    
    // Удаляем старый constraint
    const dropSuccess = await executeSql(
      'ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;',
      'Удаление старого constraint'
    )
    
    if (!dropSuccess) {
      console.log('⚠️  Продолжаем, возможно constraint не существовал')
    }
    
    // Добавляем новый constraint
    const addSuccess = await executeSql(
      "ALTER TABLE seats ADD CONSTRAINT seats_status_check CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'unavailable'));",
      'Добавление нового constraint с поддержкой \'unavailable\''
    )
    
    if (addSuccess) {
      console.log('\n🎉 Constraint успешно обновлен!')
      console.log('Теперь поддерживаются статусы: available, reserved, sold, blocked, unavailable')
    } else {
      console.log('\n❌ Не удалось обновить constraint')
      console.log('\n📋 Выполните следующие команды вручную в SQL Editor Supabase:')
      console.log('1. ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;')
      console.log('2. ALTER TABLE seats ADD CONSTRAINT seats_status_check CHECK (status IN (\'available\', \'reserved\', \'sold\', \'blocked\', \'unavailable\'));')
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message)
    console.log('\n📋 Выполните следующие команды вручную в SQL Editor Supabase:')
    console.log('1. ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;')
    console.log('2. ALTER TABLE seats ADD CONSTRAINT seats_status_check CHECK (status IN (\'available\', \'reserved\', \'sold\', \'blocked\', \'unavailable\'));')
    process.exit(1)
  }
}

// Запускаем скрипт
if (require.main === module) {
  main()
}

module.exports = { executeSql }