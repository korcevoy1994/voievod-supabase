require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeats() {
  try {
    console.log('Проверяем таблицу seats...');
    
    // Проверяем общее количество мест
    const { count, error: countError } = await supabase
      .from('seats')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Ошибка при подсчете мест:', countError);
      return;
    }
    
    console.log(`Общее количество мест: ${count}`);
    
    // Проверяем первые 5 мест
    const { data: seats, error } = await supabase
      .from('seats')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Ошибка при получении мест:', error);
      return;
    }
    
    console.log('Первые 5 мест:');
    console.log(seats);
    
    // Проверяем места по зонам
    const { data: zones, error: zonesError } = await supabase
      .from('seats')
      .select('zone')
      .group('zone');
    
    if (!zonesError) {
      console.log('Доступные зоны:', zones);
    }
    
  } catch (err) {
    console.error('Общая ошибка:', err);
  }
}

checkSeats();