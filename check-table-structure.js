const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('Checking table structures...');
    
    // Проверяем структуру таблицы orders
    console.log('\n=== ORDERS TABLE ===');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.log('Orders table error:', ordersError.message);
    } else {
      console.log('Orders table exists, sample data:', ordersData);
    }
    
    // Проверяем структуру таблицы order_seats
    console.log('\n=== ORDER_SEATS TABLE ===');
    const { data: orderSeatsData, error: orderSeatsError } = await supabase
      .from('order_seats')
      .select('*')
      .limit(1);
    
    if (orderSeatsError) {
      console.log('Order_seats table error:', orderSeatsError.message);
    } else {
      console.log('Order_seats table exists, sample data:', orderSeatsData);
    }
    
    // Проверяем структуру таблицы tickets
    console.log('\n=== TICKETS TABLE ===');
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1);
    
    if (ticketsError) {
      console.log('Tickets table error:', ticketsError.message);
    } else {
      console.log('Tickets table exists, sample data:', ticketsData);
    }
    
    // Попробуем создать тестовый заказ с коротким ID
    console.log('\n=== TESTING SHORT ID INSERTION ===');
    const testOrderId = 'TEST1234';
    
    const { data: testOrder, error: testOrderError } = await supabase
      .from('orders')
      .insert({
        id: testOrderId,
        user_id: 'test@example.com',
        customer_email: 'test@example.com',
        customer_first_name: 'Test',
        customer_last_name: 'User',
        total_price: 100,
        total_tickets: 1,
        status: 'pending'
      })
      .select();
    
    if (testOrderError) {
      console.log('Test order insertion failed:', testOrderError.message);
      
      // Попробуем с UUID
      console.log('Trying with UUID...');
      const { data: testOrderUUID, error: testOrderUUIDError } = await supabase
        .from('orders')
        .insert({
          user_id: 'test@example.com',
          customer_email: 'test@example.com',
          customer_first_name: 'Test',
          customer_last_name: 'User',
          total_price: 100,
          total_tickets: 1,
          status: 'pending'
        })
        .select();
      
      if (testOrderUUIDError) {
        console.log('UUID insertion also failed:', testOrderUUIDError.message);
      } else {
        console.log('✓ Table uses UUID for ID field');
        console.log('Test order with UUID:', testOrderUUID[0]);
        
        // Удаляем тестовый заказ
        await supabase.from('orders').delete().eq('id', testOrderUUID[0].id);
      }
    } else {
      console.log('✓ Table uses short ID for ID field');
      console.log('Test order with short ID:', testOrder[0]);
      
      // Удаляем тестовый заказ
      await supabase.from('orders').delete().eq('id', testOrderId);
    }
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();