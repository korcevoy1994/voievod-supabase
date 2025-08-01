require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFunctionFix() {
  console.log('🔧 Applying function fix...');
  
  try {
    // Читаем SQL файл
    const sqlContent = fs.readFileSync(path.join(__dirname, 'fix-generate-unique-short-id.sql'), 'utf8');
    
    // Разбиваем на отдельные команды
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Found ${commands.length} SQL commands to execute`);
    
    // Выполняем каждую команду отдельно
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`\n${i + 1}. Executing command...`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        try {
          // Используем raw SQL через rpc если доступно
          const { data, error } = await supabase.rpc('exec_sql', { sql: command });
          
          if (error) {
            console.error(`❌ Error in command ${i + 1}:`, error);
            // Продолжаем выполнение других команд
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in command ${i + 1}:`, err.message);
        }
      }
    }
    
    // Тестируем исправленную функцию
    console.log('\n🧪 Testing fixed function...');
    
    try {
      const { data: testResult, error: testError } = await supabase
        .from('order_payments')
        .insert({
          order_id: '550e8400-e29b-41d4-a716-446655440000',
          event_id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          payment_method: 'card',
          payment_provider: 'maib',
          status: 'pending'
        })
        .select()
        .single();
      
      if (testError) {
        console.error('❌ Test insert failed:', testError);
      } else {
        console.log('✅ Test insert successful:', testResult.id);
        
        // Удаляем тестовую запись
        await supabase
          .from('order_payments')
          .delete()
          .eq('id', testResult.id);
        console.log('🗑️ Test record deleted');
      }
    } catch (testErr) {
      console.error('❌ Test failed:', testErr);
    }
    
  } catch (error) {
    console.error('❌ Critical error:', error);
  }
}

applyFunctionFix();