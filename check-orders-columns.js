require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrdersColumns() {
  try {
    console.log('Checking what columns actually exist in orders table...');
    
    // Попробуем выполнить SQL запрос напрямую для получения структуры таблицы
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'orders' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (error) {
      console.log('Error with exec_sql, trying alternative approach:', error.message);
      
      // Альтернативный подход - попробуем описать таблицу через SQL
      const { data: describeData, error: describeError } = await supabase
        .from('orders')
        .select('*')
        .limit(0); // Получаем только структуру, без данных
      
      if (describeError) {
        console.log('Error describing orders table:', describeError);
        
        // Последняя попытка - проверим через информационную схему PostgreSQL
        console.log('\nTrying to check table existence...');
        const { data: tableExists, error: tableError } = await supabase
          .rpc('check_table_exists', { table_name: 'orders' });
        
        if (tableError) {
          console.log('Cannot check table existence:', tableError.message);
          
          // Попробуем создать таблицу заново
          console.log('\nTrying to recreate orders table...');
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS orders (
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
          `;
          
          const { data: createResult, error: createError } = await supabase
            .rpc('exec_sql', { query: createTableSQL });
          
          if (createError) {
            console.log('❌ Failed to create orders table:', createError);
          } else {
            console.log('✅ Orders table created/verified');
          }
        }
      } else {
        console.log('Orders table structure (from select):', describeData);
      }
    } else {
      console.log('Orders table columns:', data);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkOrdersColumns();