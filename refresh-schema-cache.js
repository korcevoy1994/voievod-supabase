require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refreshSchemaCache() {
  console.log('🔄 Обновление кэша схемы Supabase...');
  
  try {
    // Попробуем выполнить простой запрос к таблице order_general_access
    console.log('📋 Проверка структуры order_general_access...');
    const { data, error } = await supabase
      .from('order_general_access')
      .select('*')
      .limit(0);
    
    if (error) {
      console.error('❌ Ошибка при проверке order_general_access:', error);
    } else {
      console.log('✅ Таблица order_general_access доступна');
    }
    
    // Проверим структуру orders
    console.log('📋 Проверка структуры orders...');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(0);
    
    if (ordersError) {
      console.error('❌ Ошибка при проверке orders:', ordersError);
    } else {
      console.log('✅ Таблица orders доступна');
    }
    
    // Попробуем создать тестовую запись для проверки колонок
    console.log('🧪 Тестирование вставки в order_general_access...');
    const testOrderId = '00000000-0000-0000-0000-000000000000';
    
    const { data: insertData, error: insertError } = await supabase
      .from('order_general_access')
      .insert({
        order_id: testOrderId,
        ticket_name: 'Test Ticket',
        price: 100.00,
        quantity: 1
      })
      .select();
    
    if (insertError) {
      console.error('❌ Ошибка при тестовой вставке:', insertError);
    } else {
      console.log('✅ Тестовая вставка успешна:', insertData);
      
      // Удаляем тестовую запись
      await supabase
        .from('order_general_access')
        .delete()
        .eq('order_id', testOrderId);
      console.log('🗑️ Тестовая запись удалена');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

refreshSchemaCache();