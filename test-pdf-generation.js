const { createClient } = require('@supabase/supabase-js');

// Настройки Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPDFGeneration() {
  try {
    console.log('🔍 Поиск заказов с билетами...');
    
    // Получаем заказы со статусом 'paid'
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_first_name, customer_last_name, status')
      .eq('status', 'paid')
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Ошибка получения заказов:', ordersError);
      return;
    }
    
    if (!orders || orders.length === 0) {
      console.log('⚠️ Не найдено заказов со статусом "paid"');
      return;
    }
    
    console.log(`✅ Найдено ${orders.length} заказов:`);
    orders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.id} - ${order.customer_first_name} ${order.customer_last_name}`);
    });
    
    // Проверяем билеты для первого заказа
    const testOrder = orders[0];
    console.log(`\n🎫 Проверка билетов для заказа ${testOrder.id}...`);
    
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        seat_id,
        metadata,
        order_id
      `)
      .eq('order_id', testOrder.id);
    
    if (ticketsError) {
      console.error('❌ Ошибка получения билетов:', ticketsError);
      return;
    }
    
    if (!tickets || tickets.length === 0) {
      console.log('⚠️ Билеты не найдены для этого заказа');
      return;
    }
    
    console.log(`✅ Найдено ${tickets.length} билетов:`);
    tickets.forEach((ticket, index) => {
      console.log(`  ${index + 1}. ${ticket.ticket_number}`);
      console.log(`     QR код: ${ticket.qr_code ? 'Есть' : 'Отсутствует'}`);
      console.log(`     Место: ${ticket.seat_id ? 'Да' : 'Общий доступ'}`);
      if (ticket.qr_code) {
        try {
          const qrData = typeof ticket.qr_code === 'string' ? JSON.parse(ticket.qr_code) : ticket.qr_code;
          console.log(`     QR данные: ticket_id=${qrData.ticket_id}, ticket_number=${qrData.ticket_number}`);
        } catch (e) {
          console.log(`     QR данные: ${JSON.stringify(ticket.qr_code).substring(0, 50)}...`);
        }
      }
    });
    
    console.log('\n✅ Тест завершен успешно!');
    console.log('\n📝 Для тестирования PDF генерации используйте:');
    console.log(`   GET /api/tickets/pdf?orderId=${testOrder.id}`);
    console.log(`   GET /api/tickets/pdf?orderId=${testOrder.id}&ticketIndex=1`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запуск теста
testPDFGeneration();