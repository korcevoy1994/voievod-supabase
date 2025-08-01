require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugOrderPaymentsIssue() {
  console.log('🔍 Debugging order_payments issue...');
  
  try {
    // 1. Проверяем, какие таблицы существуют
    console.log('\n1. Checking existing tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%order_payments%');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Order payments related tables:', tables);
    }
    
    // 2. Проверяем структуру таблицы order_payments
    console.log('\n2. Checking order_payments table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'order_payments')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
    } else {
      console.log('order_payments columns:', columns);
    }
    
    // 3. Попробуем вставить тестовую запись
    console.log('\n3. Testing insert into order_payments...');
    const testOrderId = '550e8400-e29b-41d4-a716-446655440000';
    const testEventId = '550e8400-e29b-41d4-a716-446655440000';
    
    const { data: insertResult, error: insertError } = await supabase
      .from('order_payments')
      .insert({
        order_id: testOrderId,
        event_id: testEventId,
        amount: 100,
        payment_method: 'card',
        payment_provider: 'maib',
        status: 'pending'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertResult);
      
      // Удаляем тестовую запись
      await supabase
        .from('order_payments')
        .delete()
        .eq('id', insertResult.id);
      console.log('🗑️ Test record deleted');
    }
    
  } catch (error) {
    console.error('❌ Critical error:', error);
  }
}

debugOrderPaymentsIssue();