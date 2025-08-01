const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyOrderPaymentsFix() {
  try {
    console.log('🔧 Применение исправления для order_payments...');
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('./fix-order-payments-event-id.sql', 'utf8');
    
    // Создаем клиент Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Отсутствуют переменные окружения Supabase');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Разбиваем SQL на отдельные команды
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Найдено ${sqlStatements.length} SQL команд`);
    
    // Выполняем каждую команду
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`⚡ Выполнение команды ${i + 1}:`, statement.substring(0, 50) + '...');
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        console.error(`❌ Ошибка в команде ${i + 1}:`, error);
        throw error;
      }
      
      console.log(`✅ Команда ${i + 1} выполнена успешно`);
    }
    
    console.log('🎉 Исправление применено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка применения исправления:', error.message);
    process.exit(1);
  }
}

applyOrderPaymentsFix();