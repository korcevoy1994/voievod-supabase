/**
 * Скрипт для проверки данных в базе данных
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseData() {
  console.log('🔍 Проверка данных в базе данных');
  console.log('=' .repeat(50));
  
  try {
    // Проверяем заказы
    console.log('\n📋 Проверка заказов:');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_price, customer_email')
      .limit(5);
    
    if (ordersError) {
      console.log('❌ Ошибка получения заказов:', ordersError);
    } else {
      console.log(`✅ Найдено заказов: ${orders.length}`);
      orders.forEach((order, index) => {
        console.log(`  ${index + 1}. ID: ${order.id.substring(0, 8)}..., Статус: ${order.status}, Сумма: ${order.total_price}`);
      });
    }
    
    // Проверяем платежи
    console.log('\n💳 Проверка платежей (order_payments):');
    const { data: payments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('id, order_id, status, amount, payment_provider')
      .limit(5);
    
    if (paymentsError) {
      console.log('❌ Ошибка получения платежей:', paymentsError);
    } else {
      console.log(`✅ Найдено платежей: ${payments.length}`);
      payments.forEach((payment, index) => {
        console.log(`  ${index + 1}. ID: ${payment.id.substring(0, 8)}..., Order: ${payment.order_id.substring(0, 8)}..., Статус: ${payment.status}, Сумма: ${payment.amount}`);
      });
    }
    
    // Проверяем связь заказов и платежей
    console.log('\n🔗 Проверка связи заказов и платежей:');
    const { data: ordersWithPayments, error: joinError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_price,
        order_payments(
          id,
          status,
          amount,
          payment_provider
        )
      `)
      .eq('status', 'paid')
      .limit(3);
    
    if (joinError) {
      console.log('❌ Ошибка получения связанных данных:', joinError);
    } else {
      console.log(`✅ Найдено оплаченных заказов: ${ordersWithPayments.length}`);
      ordersWithPayments.forEach((order, index) => {
        console.log(`  ${index + 1}. Заказ: ${order.id.substring(0, 8)}..., Статус: ${order.status}`);
        if (order.order_payments && order.order_payments.length > 0) {
          order.order_payments.forEach((payment, pIndex) => {
            console.log(`     Платеж ${pIndex + 1}: ${payment.id.substring(0, 8)}..., Статус: ${payment.status}, Сумма: ${payment.amount}`);
          });
        } else {
          console.log('     ⚠️  Платежи не найдены');
        }
      });
    }
    
    // Проверяем структуру таблиц
    console.log('\n🏗️  Проверка структуры таблиц:');
    
    // Проверяем есть ли таблица order_payments
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['orders', 'order_payments', 'payments']);
    
    if (tableError) {
      console.log('❌ Ошибка проверки таблиц:', tableError);
    } else {
      console.log('✅ Существующие таблицы:');
      tableCheck.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Проверка завершена');
}

checkDatabaseData().catch(console.error);