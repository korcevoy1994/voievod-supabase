require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrdersStatus() {
  try {
    console.log('Checking orders table structure and constraints...');
    
    // Проверяем структуру таблицы orders
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'orders' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (columnsError) {
      console.log('Error getting columns:', columnsError.message);
    } else {
      console.log('Orders table columns:', columns);
    }
    
    // Проверяем ограничения CHECK
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT conname, consrc
          FROM pg_constraint
          WHERE conrelid = 'orders'::regclass
          AND contype = 'c';
        `
      });
    
    if (constraintsError) {
      console.log('Error getting constraints:', constraintsError.message);
    } else {
      console.log('Orders table CHECK constraints:', constraints);
    }
    
    // Проверяем текущие статусы заказов
    const { data: statuses, error: statusesError } = await supabase
      .from('orders')
      .select('status')
      .limit(100);
    
    if (statusesError) {
      console.log('Error getting order statuses:', statusesError.message);
    } else {
      const uniqueStatuses = [...new Set(statuses.map(o => o.status))];
      console.log('Current order statuses in use:', uniqueStatuses);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkOrdersStatus();