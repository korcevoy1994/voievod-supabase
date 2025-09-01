const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agczsbflkxcpexewnjpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnY3pzYmZsa3hjcGV4ZXduanBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUyMTQzMiwiZXhwIjoyMDY5MDk3NDMyfQ.pgUG_JpA_UyZV1braOoGXtwfzKnIqM5zRPpTRSCdPAs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTicketsData() {
  try {
    console.log('🔍 Проверяем данные в таблице tickets...');
    
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    console.log('📊 Найдено билетов:', tickets.length);
    
    tickets.forEach((ticket, index) => {
      console.log(`\n🎫 Билет ${index + 1}:`);
      console.log('  Все поля:', Object.keys(ticket));
      console.log('  ticket_number:', ticket.ticket_number);
      console.log('  order_id:', ticket.order_id);
      console.log('  qr_code:', ticket.qr_code);
      
      // Попробуем распарсить QR код
      try {
        const qrData = JSON.parse(ticket.qr_code);
        console.log('  📱 QR код (JSON):');
        console.log('    ', JSON.stringify(qrData, null, 4));
      } catch (e) {
        console.log('  📱 QR код (строка):', ticket.qr_code);
      }
    });
    
    // Также проверим данные в таблице orders
    console.log('\n🛒 Проверяем данные в таблице orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, qr_code, customer_first_name, customer_last_name')
      .limit(2);
    
    if (ordersError) {
      console.error('❌ Ошибка orders:', ordersError);
      return;
    }
    
    orders.forEach((order, index) => {
      console.log(`\n📦 Заказ ${index + 1}:`);
      console.log('  id:', order.id);
      console.log('  customer:', order.customer_first_name, order.customer_last_name);
      console.log('  qr_code:', order.qr_code);
      
      // Попробуем распарсить QR код заказа
      try {
        const qrData = JSON.parse(order.qr_code);
        console.log('  📱 QR код заказа (JSON):');
        console.log('    ', JSON.stringify(qrData, null, 4));
      } catch (e) {
        console.log('  📱 QR код заказа (строка):', order.qr_code);
      }
    });
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkTicketsData();