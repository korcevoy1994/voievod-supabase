const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSeatFill() {
  try {
    console.log('Simulating API call to /api/zones/210/seats...');
    
    // Simulate the same logic as in /api/zones/[zoneId]/seats/route.ts
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select('*')
      .eq('zone', 210)
      .order('row')
      .order('number');
    
    if (seatsError) {
      console.error('Error fetching seats:', seatsError);
      return;
    }
    
    const { data: zoneColorData, error: colorError } = await supabase
      .from('zone_colors')
      .select('color')
      .eq('zone', 210)
      .single();
    
    if (colorError) {
      console.error('Error fetching zone color:', colorError);
      return;
    }
    
    const zoneColor = zoneColorData?.color || '#8525D9';
    console.log('Zone color from database:', zoneColor);
    
    // Transform seats data like in the API
    const transformedSeats = seats.map(seat => ({
      id: seat.id,
      zone: seat.zone,
      row: seat.row,
      number: seat.number,
      price: seat.price,
      status: seat.status,
      x_coordinate: seat.x_coordinate,
      y_coordinate: seat.y_coordinate,
      fill: zoneColor // This is what gets set as seat.fill
    }));
    
    console.log('\nFirst 5 transformed seats:');
    transformedSeats.slice(0, 5).forEach(seat => {
      console.log(`Seat ${seat.row}${seat.number}: status=${seat.status}, fill=${seat.fill}`);
    });
    
    console.log('\nAll seats should have fill:', zoneColor);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSeatFill();