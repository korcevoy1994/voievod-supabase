require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPricingIssues() {
  try {
    console.log('Finding zones with pricing issues...');
    
    // Get all zone pricing data
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*')
      .order('zone');
    
    if (zonePricingError) {
      console.error('Error fetching zone pricing:', zonePricingError);
      return;
    }
    
    const problemZones = [];
    
    // Check actual seat prices for each zone
    for (const zonePrice of zonePricing) {
      const { data: sampleSeats, error: seatsError } = await supabase
        .from('seats')
        .select('zone, row, number, price, custom_price')
        .eq('zone', zonePrice.zone)
        .limit(5);
      
      if (seatsError) {
        console.error(`Error fetching seats for zone ${zonePrice.zone}:`, seatsError);
        continue;
      }
      
      // Check if prices match
      const mismatchedSeats = sampleSeats.filter(seat => seat.price !== zonePrice.price);
      if (mismatchedSeats.length > 0) {
        problemZones.push({
          zone: zonePrice.zone,
          expectedPrice: zonePrice.price,
          actualPrices: [...new Set(sampleSeats.map(s => s.price))],
          sampleCount: sampleSeats.length,
          mismatchCount: mismatchedSeats.length
        });
      }
    }
    
    if (problemZones.length === 0) {
      console.log('✅ All zones have correct pricing!');
    } else {
      console.log(`\n❌ Found ${problemZones.length} zones with pricing issues:`);
      console.table(problemZones);
      
      console.log('\nZones that need price updates:');
      problemZones.forEach(zone => {
        console.log(`Zone ${zone.zone}: Expected ${zone.expectedPrice}, Found ${zone.actualPrices.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findPricingIssues();