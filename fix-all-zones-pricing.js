require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllZonesPricing() {
  try {
    console.log('Starting mass price update for all zones...');
    
    // Get all zone pricing data
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*')
      .order('zone');
    
    if (zonePricingError) {
      console.error('Error fetching zone pricing:', zonePricingError);
      return;
    }
    
    console.log(`Found ${zonePricing.length} zones to process...`);
    
    let updatedZones = 0;
    let totalUpdatedSeats = 0;
    
    // Update prices for each zone
    for (const zonePrice of zonePricing) {
      console.log(`\nProcessing zone ${zonePrice.zone}...`);
      
      // First, check if this zone needs updating
      const { data: sampleSeats, error: checkError } = await supabase
        .from('seats')
        .select('price')
        .eq('zone', zonePrice.zone)
        .limit(1);
      
      if (checkError) {
        console.error(`Error checking zone ${zonePrice.zone}:`, checkError);
        continue;
      }
      
      if (sampleSeats.length === 0) {
        console.log(`No seats found in zone ${zonePrice.zone}, skipping...`);
        continue;
      }
      
      if (sampleSeats[0].price === zonePrice.price) {
        console.log(`Zone ${zonePrice.zone} already has correct price (${zonePrice.price}), skipping...`);
        continue;
      }
      
      // Update all seats in this zone
      const { data: updateResult, error: updateError } = await supabase
        .from('seats')
        .update({ 
          price: zonePrice.price,
          custom_price: false
        })
        .eq('zone', zonePrice.zone)
        .select('id');
      
      if (updateError) {
        console.error(`Error updating zone ${zonePrice.zone}:`, updateError);
        continue;
      }
      
      const seatsUpdated = updateResult ? updateResult.length : 0;
      console.log(`✅ Updated ${seatsUpdated} seats in zone ${zonePrice.zone} to price ${zonePrice.price}`);
      
      updatedZones++;
      totalUpdatedSeats += seatsUpdated;
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Mass update completed!`);
    console.log(`Updated ${updatedZones} zones`);
    console.log(`Updated ${totalUpdatedSeats} total seats`);
    
    // Verify a few zones
    console.log('\nVerifying updates...');
    const verifyZones = ['204', '205', '210', 'vip2'];
    
    for (const zone of verifyZones) {
      const { data: verifySeats, error: verifyError } = await supabase
        .from('seats')
        .select('zone, price, custom_price')
        .eq('zone', zone)
        .limit(2);
      
      if (!verifyError && verifySeats.length > 0) {
        const zonePriceData = zonePricing.find(zp => zp.zone === zone);
        const expectedPrice = zonePriceData ? zonePriceData.price : 'unknown';
        const actualPrice = verifySeats[0].price;
        const status = actualPrice === expectedPrice ? '✅' : '❌';
        console.log(`${status} Zone ${zone}: Expected ${expectedPrice}, Actual ${actualPrice}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAllZonesPricing();