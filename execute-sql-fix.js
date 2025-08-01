require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQLFix() {
  try {
    console.log('Reading SQL fix script...');
    const sqlScript = fs.readFileSync('./fix-orders-table.sql', 'utf8');
    
    // Разбиваем скрипт на отдельные команды
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Found ${commands.length} SQL commands to execute`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`\nExecuting command ${i + 1}/${commands.length}:`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            query: command
          });
          
          if (error) {
            console.log(`❌ Error in command ${i + 1}:`, error.message);
            // Продолжаем выполнение остальных команд
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Exception in command ${i + 1}:`, err.message);
        }
        
        // Небольшая пауза между командами
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== Testing the fix ===');
    
    // Тестируем создание заказа
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
      console.log('❌ Test order creation still fails:', orderError);
    } else {
      console.log('✅ Test order created successfully:', newOrder.id);
      
      // Удаляем тестовый заказ
      await supabase
        .from('orders')
        .delete()
        .eq('id', newOrder.id);
      console.log('✅ Test order cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

executeSQLFix();