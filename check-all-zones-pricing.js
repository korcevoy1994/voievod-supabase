require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllZonesPricing() {
  try {
    console.log('Checking pricing for all zones...');
    
    // Get all zone pricing data
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*')
      .order('zone');
    
    if (zonePricingError) {
      console.error('Error fetching zone pricing:', zonePricingError);
      return;
    }
    
    console.log('\nZone Pricing Table:');
    console.table(zonePricing);
    
    // Check actual seat prices for each zone
    for (const zonePrice of zonePricing) {
      const { data: sampleSeats, error: seatsError } = await supabase
        .from('seats')
        .select('zone, row, number, price, custom_price')
        .eq('zone', zonePrice.zone)
        .limit(3);
      
      if (seatsError) {
        console.error(`Error fetching seats for zone ${zonePrice.zone}:`, seatsError);
        continue;
      }
      
      console.log(`\nZone ${zonePrice.zone}:`);
      console.log(`Expected price: ${zonePrice.price}`);
      console.log('Sample seats:');
      console.table(sampleSeats);
      
      // Check if prices match
      const mismatchedSeats = sampleSeats.filter(seat => seat.price !== zonePrice.price);
      if (mismatchedSeats.length > 0) {
        console.log(`❌ Zone ${zonePrice.zone} has price mismatches!`);
      } else {
        console.log(`✅ Zone ${zonePrice.zone} prices are correct`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllZonesPricing();