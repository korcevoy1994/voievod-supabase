const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function applyOrderPaymentsFix() {
  try {
    console.log('🔧 Применение исправления для order_payments...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Отсутствуют переменные окружения Supabase (нужен SERVICE_ROLE_KEY)');
    }
    
    // Используем сервисную роль для выполнения DDL операций
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('./fix-order-payments-complete.sql', 'utf8');
    
    console.log('📝 Выполнение SQL исправления...');
    
    // Выполняем SQL через RPC функцию
    const { data, error } = await supabase.rpc('exec', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('❌ Ошибка выполнения SQL:', error);
      
      // Попробуем альтернативный способ - разбить на отдельные команды
      console.log('🔄 Пробуем выполнить команды по отдельности...');
      
      const commands = [
        "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS event_id UUID;",
        "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);",
        "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS provider_data JSONB;",
        "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MDL';",
        "ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;",
        "CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);",
        "CREATE INDEX IF NOT EXISTS idx_order_payments_event_id ON order_payments(event_id);",
        "CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);"
      ];
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚡ Выполнение команды ${i + 1}: ${command.substring(0, 50)}...`);
        
        try {
          const { error: cmdError } = await supabase.rpc('exec', {
            sql: command
          });
          
          if (cmdError) {
            console.error(`❌ Ошибка в команде ${i + 1}:`, cmdError.message);
          } else {
            console.log(`✅ Команда ${i + 1} выполнена успешно`);
          }
        } catch (cmdErr) {
          console.error(`❌ Исключение в команде ${i + 1}:`, cmdErr.message);
        }
      }
    } else {
      console.log('✅ SQL исправление выполнено успешно');
    }
    
    // Проверяем результат
    console.log('\n🔍 Проверка результата...');
    
    const testData = {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100,
      payment_method: 'card',
      payment_provider: 'maib',
      provider_payment_id: 'test-payment-id',
      status: 'pending',
      provider_data: {
        payUrl: 'https://test.com',
        transactionId: 'test-tx-id'
      }
    };
    
    const { data: testResult, error: testError } = await supabase
      .from('order_payments')
      .insert(testData)
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Тест не прошел:', testError);
    } else {
      console.log('✅ Тест прошел успешно!');
      console.log('📋 Доступные колонки:');
      Object.keys(testResult).forEach(col => {
        console.log(`  - ${col}`);
      });
      
      // Удаляем тестовую запись
      await supabase
        .from('order_payments')
        .delete()
        .eq('id', testResult.id);
      console.log('🗑️ Тестовая запись удалена');
    }
    
    console.log('🎉 Исправление завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка применения исправления:', error.message);
    process.exit(1);
  }
}

applyOrderPaymentsFix();