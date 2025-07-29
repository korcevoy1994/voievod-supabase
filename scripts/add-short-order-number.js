const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addShortOrderNumber() {
  try {
    console.log('🔧 Добавляем поле short_order_number в таблицу orders...');
    
    // Сначала проверим, есть ли уже это поле
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'orders')
      .eq('column_name', 'short_order_number');
    
    if (checkError) {
      console.log('⚠️ Не удалось проверить существование поля, продолжаем...');
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Поле short_order_number уже существует');
    } else {
      console.log('📝 Поле short_order_number не найдено, нужно добавить через SQL');
    }
    
    // Проверим существующие заказы
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at')
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Ошибка получения заказов:', ordersError);
      return;
    }
    
    console.log(`📊 Найдено ${orders?.length || 0} заказов`);
    
    if (orders && orders.length > 0) {
      console.log('📋 Примеры заказов:');
      orders.forEach((order, index) => {
        const year = new Date(order.created_at).getFullYear();
        const shortNumber = `ORD-${year}-${String(1000 + index).padStart(4, '0')}`;
        console.log(`  ${order.id} -> ${shortNumber}`);
      });
    }
    
    console.log('\n🎯 Для добавления поля short_order_number выполните следующие SQL команды в Supabase Dashboard:');
    console.log('\n-- 1. Добавить поле');
    console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS short_order_number VARCHAR(20) UNIQUE;');
    
    console.log('\n-- 2. Создать индекс');
    console.log('CREATE INDEX IF NOT EXISTS idx_orders_short_order_number ON orders(short_order_number);');
    
    console.log('\n-- 3. Создать последовательность');
    console.log('CREATE SEQUENCE IF NOT EXISTS short_order_number_seq START 1000;');
    
    console.log('\n-- 4. Создать функцию генерации');
    console.log(`CREATE OR REPLACE FUNCTION generate_short_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    short_number VARCHAR(20);
    counter INTEGER;
    max_attempts INTEGER := 100;
BEGIN
    FOR counter IN 1..max_attempts LOOP
        short_number := 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('short_order_number_seq')::TEXT, 4, '0');
        
        IF NOT EXISTS (SELECT 1 FROM orders WHERE short_order_number = short_number) THEN
            RETURN short_number;
        END IF;
    END LOOP;
    
    RETURN 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
END;
$$ LANGUAGE plpgsql;`);
    
    console.log('\n-- 5. Создать триггер-функцию');
    console.log(`CREATE OR REPLACE FUNCTION set_short_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.short_order_number IS NULL THEN
        NEW.short_order_number := generate_short_order_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`);
    
    console.log('\n-- 6. Создать триггер');
    console.log(`DROP TRIGGER IF EXISTS trigger_set_short_order_number ON orders;
CREATE TRIGGER trigger_set_short_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_short_order_number();`);
    
    console.log('\n-- 7. Обновить существующие заказы');
    console.log('UPDATE orders SET short_order_number = generate_short_order_number() WHERE short_order_number IS NULL;');
    
    console.log('\n📝 После выполнения этих команд, каждый новый заказ будет автоматически получать короткий номер в формате ORD-YYYY-NNNN');
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

addShortOrderNumber();