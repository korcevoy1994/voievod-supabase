require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recreateOrdersTable() {
  try {
    console.log('Attempting to recreate orders table...');
    
    // Сначала попробуем удалить существующую таблицу
    console.log('\n1. Trying to drop existing orders table...');
    try {
      // Попробуем удалить через SQL запрос
      const { data, error } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все записи
      
      if (error) {
        console.log('Could not clear orders table:', error.message);
      } else {
        console.log('Cleared existing orders data');
      }
    } catch (err) {
      console.log('Error clearing orders:', err.message);
    }
    
    // Попробуем создать таблицу через Supabase Dashboard API
    console.log('\n2. Checking if we can access Supabase management API...');
    
    // Альтернативный подход - попробуем создать таблицу через SQL в комментариях
    console.log('\n3. Manual table creation required.');
    console.log('Please execute the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(`
-- Drop existing table
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_price DECIMAL(10,2) NOT NULL,
    total_tickets INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
`);
    console.log('\n' + '='.repeat(80));
    
    // Попробуем альтернативный способ - создание через REST API
    console.log('\n4. Trying alternative approach...');
    
    // Проверим, можем ли мы хотя бы получить информацию о таблице
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'orders');
    
    if (tableError) {
      console.log('Cannot access information_schema:', tableError.message);
    } else {
      console.log('Table info:', tableInfo);
    }
    
    // Последняя попытка - создать таблицу через простую вставку
    console.log('\n5. Testing simple insert to see current schema...');
    const { data: insertTest, error: insertError } = await supabase
      .from('orders')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        user_id: 'test',
        customer_email: 'test@test.com',
        customer_first_name: 'Test',
        customer_last_name: 'User',
        total_price: 100,
        total_tickets: 1
      })
      .select();
    
    if (insertError) {
      console.log('Insert test failed:', insertError);
      console.log('\nThis confirms the table structure is incorrect.');
      console.log('Please manually execute the SQL above in Supabase Dashboard.');
    } else {
      console.log('✅ Insert test succeeded! Table structure is correct.');
      // Удаляем тестовую запись
      await supabase
        .from('orders')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000001');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

recreateOrdersTable();