require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  try {
    console.log('Checking database schema and data...');
    
    // Проверяем структуру таблицы orders
    console.log('\n1. Checking orders table structure...');
    const { data: ordersSchema, error: ordersError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' })
      .select();
    
    if (ordersError) {
      console.log('Error getting orders schema (trying alternative method):', ordersError.message);
      
      // Альтернативный способ - попробуем создать пустой заказ чтобы увидеть ошибку
      const { data: testOrder, error: testError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('Error accessing orders table:', testError);
      } else {
        console.log('Orders table accessible, sample data:', testOrder);
      }
    } else {
      console.log('Orders table schema:', ordersSchema);
    }
    
    // Проверяем события
    console.log('\n2. Checking events...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');
    
    if (eventsError) {
      console.log('Error getting events:', eventsError);
    } else {
      console.log('Events found:', events?.length || 0);
      events?.forEach(event => {
        console.log(`- ${event.title} (${event.id}) - Status: ${event.status}`);
      });
    }
    
    // Проверяем активные события
    console.log('\n3. Checking active events...');
    const { data: activeEvents, error: activeError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active');
    
    if (activeError) {
      console.log('Error getting active events:', activeError);
    } else {
      console.log('Active events found:', activeEvents?.length || 0);
      activeEvents?.forEach(event => {
        console.log(`- ${event.title} (${event.id})`);
      });
    }
    
    // Попробуем создать тестовый заказ с минимальными данными
    console.log('\n4. Testing order creation...');
    const testOrderData = {
      user_id: 'test-user-' + Date.now(),
      customer_email: 'test@example.com',
      customer_first_name: 'Test',
      customer_last_name: 'User',
      total_price: 100,
      total_tickets: 1,
      payment_method: 'cash',
      status: 'pending'
    };
    
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(testOrderData)
      .select()
      .single();
    
    if (orderError) {
      console.log('❌ Error creating test order:', orderError);
    } else {
      console.log('✅ Test order created successfully:', newOrder.id);
      
      // Удаляем тестовый заказ
      await supabase
        .from('orders')
        .delete()
        .eq('id', newOrder.id);
      console.log('Test order cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkDatabaseSchema();