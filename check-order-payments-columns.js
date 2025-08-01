const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkOrderPaymentsColumns() {
  try {
    console.log('🔍 Проверка колонок таблицы order_payments...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Отсутствуют переменные окружения Supabase');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Проверяем структуру таблицы через информационную схему
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'order_payments')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (error) {
      console.error('❌ Ошибка получения структуры таблицы:', error);
      
      // Альтернативный способ - попробуем получить пустую запись
      console.log('🔄 Пробуем альтернативный способ...');
      const { data: sample, error: sampleError } = await supabase
        .from('order_payments')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('❌ Ошибка получения образца:', sampleError);
      } else {
        console.log('📋 Доступные колонки (из образца):');
        if (sample && sample.length > 0) {
          Object.keys(sample[0]).forEach(col => {
            console.log(`  - ${col}`);
          });
        } else {
          console.log('  Таблица пуста, создаем тестовую запись...');
          
          // Попробуем создать минимальную запись
          const { data: testInsert, error: insertError } = await supabase
            .from('order_payments')
            .insert({
              order_id: '550e8400-e29b-41d4-a716-446655440000',
              amount: 100,
              payment_method: 'card',
              payment_provider: 'maib',
              status: 'pending'
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('❌ Ошибка создания тестовой записи:', insertError);
          } else {
            console.log('✅ Тестовая запись создана, доступные колонки:');
            Object.keys(testInsert).forEach(col => {
              console.log(`  - ${col}`);
            });
            
            // Удаляем тестовую запись
            await supabase
              .from('order_payments')
              .delete()
              .eq('id', testInsert.id);
          }
        }
      }
    } else {
      console.log('📋 Структура таблицы order_payments:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkOrderPaymentsColumns();