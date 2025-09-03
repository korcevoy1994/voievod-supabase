require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function freePendingOrderSeats() {
  try {
    console.log('🔍 Поиск заказов с pending статусом и заблокированными местами...');
    
    // Находим все заказы со статусом 'pending'
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending');
    
    if (ordersError) {
      console.error('❌ Ошибка получения pending заказов:', ordersError);
      return;
    }
    
    console.log(`📋 Найдено ${pendingOrders.length} заказов со статусом 'pending'`);
    
    let totalFreedSeats = 0;
    
    for (const order of pendingOrders) {
      // Получаем места для каждого заказа
      const { data: orderSeats, error: seatsError } = await supabase
        .from('order_seats')
        .select('seat_id')
        .eq('order_id', order.id);
      
      if (seatsError) {
        console.error(`❌ Ошибка получения мест для заказа ${order.id}:`, seatsError);
        continue;
      }
      
      if (orderSeats && orderSeats.length > 0) {
        const seatIds = orderSeats.map(os => os.seat_id);
        
        // Проверяем, какие из этих мест имеют статус 'sold'
        const { data: soldSeats, error: soldSeatsError } = await supabase
          .from('seats')
          .select('id, status')
          .in('id', seatIds)
          .eq('status', 'sold');
        
        if (soldSeatsError) {
          console.error(`❌ Ошибка проверки статуса мест для заказа ${order.id}:`, soldSeatsError);
          continue;
        }
        
        if (soldSeats && soldSeats.length > 0) {
          console.log(`🎫 Заказ ${order.id}: найдено ${soldSeats.length} заблокированных мест`);
          
          // Освобождаем места
          const { error: updateError } = await supabase
            .from('seats')
            .update({ 
              status: 'available',
              updated_at: new Date().toISOString() 
            })
            .in('id', soldSeats.map(s => s.id));
          
          if (updateError) {
            console.error(`❌ Ошибка освобождения мест для заказа ${order.id}:`, updateError);
          } else {
            console.log(`✅ Освобождено ${soldSeats.length} мест для заказа ${order.id}`);
            totalFreedSeats += soldSeats.length;
          }
        }
      }
    }
    
    console.log(`\n🎉 Завершено! Всего освобождено мест: ${totalFreedSeats}`);
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

freePendingOrderSeats();