const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkExistingTables() {
  try {
    console.log('🔍 Проверка существующих таблиц...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Отсутствуют переменные окружения Supabase');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Список таблиц для проверки
    const tablesToCheck = [
      'order_payments',
      'order_payments_new', 
      'payments',
      'orders',
      'events',
      'seats',
      'users'
    ];
    
    console.log('📋 Проверка доступности таблиц:');
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: существует (${data.length} записей в выборке)`);
          if (data.length > 0) {
            console.log(`   Колонки: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkExistingTables();