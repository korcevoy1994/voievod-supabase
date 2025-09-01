const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkZonePricing() {
  try {
    console.log('Checking zone 203 pricing...');
    
    // Проверяем zone_pricing для зоны 203
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*')
      .eq('zone', '203');
    
    if (zonePricingError) {
      console.error('Error fetching zone pricing:', zonePricingError);
      return;
    }
    
    console.log('Zone 203 pricing data:', JSON.stringify(zonePricing, null, 2));
    
    // Проверяем несколько мест в зоне 203
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select('zone, row, number, price, custom_price')
      .eq('zone', '203')
      .limit(10);
    
    if (seatsError) {
      console.error('Error fetching seats:', seatsError);
      return;
    }
    
    console.log('Sample seats in zone 203:', JSON.stringify(seats, null, 2));
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkZonePricing();