require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceRecreateTable() {
  console.log('🔄 Принудительное пересоздание таблицы order_general_access...');
  
  try {
    // Сначала удалим таблицу
    console.log('🗑️ Удаление существующей таблицы...');
    const dropResult = await supabase.rpc('exec_sql', {
      query: 'DROP TABLE IF EXISTS order_general_access CASCADE;'
    });
    
    if (dropResult.error) {
      console.log('⚠️ Ошибка при удалении (возможно, таблица не существует):', dropResult.error.message);
    } else {
      console.log('✅ Таблица удалена');
    }
    
    // Теперь создадим таблицу заново
    console.log('🔨 Создание новой таблицы...');
    const createSQL = `
      CREATE TABLE order_general_access (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL,
        ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Включаем RLS
      ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
      
      -- Создаем политику
      CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
        FOR ALL USING (auth.role() = 'service_role');
      
      -- Создаем индекс
      CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);
    `;
    
    const createResult = await supabase.rpc('exec_sql', {
      query: createSQL
    });
    
    if (createResult.error) {
      console.error('❌ Ошибка при создании таблицы:', createResult.error);
      
      // Попробуем создать через отдельные команды
      console.log('🔄 Попытка создания через отдельные команды...');
      
      const commands = [
        `CREATE TABLE order_general_access (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_id UUID NOT NULL,
          ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        `ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;`,
        `CREATE POLICY "Service role has full access to order_general_access" ON order_general_access FOR ALL USING (auth.role() = 'service_role');`,
        `CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);`
      ];
      
      for (const cmd of commands) {
        const result = await supabase.rpc('exec_sql', { query: cmd });
        if (result.error) {
          console.error('❌ Ошибка команды:', cmd, result.error);
        } else {
          console.log('✅ Команда выполнена:', cmd.substring(0, 50) + '...');
        }
      }
    } else {
      console.log('✅ Таблица создана успешно');
    }
    
    // Тестируем вставку
    console.log('🧪 Тестирование новой таблицы...');
    const testOrderId = '00000000-0000-0000-0000-000000000000';
    
    const { data: insertData, error: insertError } = await supabase
      .from('order_general_access')
      .insert({
        order_id: testOrderId,
        ticket_name: 'Test Ticket',
        price: 100.00,
        quantity: 1
      })
      .select();
    
    if (insertError) {
      console.error('❌ Ошибка при тестовой вставке:', insertError);
    } else {
      console.log('✅ Тестовая вставка успешна:', insertData);
      
      // Удаляем тестовую запись
      await supabase
        .from('order_general_access')
        .delete()
        .eq('order_id', testOrderId);
      console.log('🗑️ Тестовая запись удалена');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

forceRecreateTable();