const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkZone210Seats() {
  try {
    console.log('Checking zone 210 seats status...');
    
    const { data: seats, error } = await supabase
      .from('seats')
      .select('id, zone, row, number, status')
      .eq('zone', 210)
      .order('row')
      .order('number');
    
    if (error) {
      console.error('Error fetching seats:', error);
      return;
    }
    
    console.log(`Found ${seats.length} seats in zone 210`);
    
    // Count by status
    const statusCounts = seats.reduce((acc, seat) => {
      acc[seat.status] = (acc[seat.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nStatus distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count} seats`);
    });
    
    // Show first few seats as examples
    console.log('\nFirst 10 seats:');
    seats.slice(0, 10).forEach(seat => {
      console.log(`Row ${seat.row}, Seat ${seat.number}: ${seat.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkZone210Seats();