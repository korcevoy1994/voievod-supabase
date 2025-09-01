const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSeatPrices() {
  try {
    console.log('Updating seat prices for zone 203...');
    
    // Обновляем цены мест в зоне 203 напрямую
    const { data, error } = await supabase
      .from('seats')
      .update({ 
        price: 550,
        updated_at: new Date().toISOString()
      })
      .eq('zone', '203')
      .eq('custom_price', false);
    
    if (error) {
      console.error('Error updating seat prices:', error);
      return;
    }
    
    console.log('Seat prices updated successfully!');
    console.log('Updated data:', data);
    
    // Проверяем результат
    console.log('\nChecking updated prices...');
    const { data: updatedSeats, error: checkError } = await supabase
      .from('seats')
      .select('zone, row, number, price, custom_price')
      .eq('zone', '203')
      .limit(5);
    
    if (checkError) {
      console.error('Error checking updated prices:', checkError);
      return;
    }
    
    console.log('Sample updated seats:', JSON.stringify(updatedSeats, null, 2));
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateSeatPrices();