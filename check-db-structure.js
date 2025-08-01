require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructures() {
  console.log('Checking database table structures...');
  
  try {
    // Проверяем структуру order_payments
    console.log('\n=== ORDER_PAYMENTS TABLE ===');
    const { data: orderPayments, error: opError } = await supabase
      .from('order_payments')
      .select('*')
      .limit(1);
    
    if (opError) {
      console.log('order_payments table error:', opError.message);
    } else {
      console.log('order_payments exists, sample columns:', Object.keys(orderPayments[0] || {}));
    }
    
    // Проверяем структуру zone_pricing
    console.log('\n=== ZONE_PRICING TABLE ===');
    const { data: zonePricing, error: zpError } = await supabase
      .from('zone_pricing')
      .select('*')
      .limit(1);
    
    if (zpError) {
      console.log('zone_pricing table error:', zpError.message);
    } else {
      console.log('zone_pricing exists, sample columns:', Object.keys(zonePricing[0] || {}));
      console.log('zone_pricing count:', zonePricing.length);
    }
    
    // Проверяем структуру zone_colors
    console.log('\n=== ZONE_COLORS TABLE ===');
    const { data: zoneColors, error: zcError } = await supabase
      .from('zone_colors')
      .select('*')
      .limit(1);
    
    if (zcError) {
      console.log('zone_colors table error:', zcError.message);
    } else {
      console.log('zone_colors exists, sample columns:', Object.keys(zoneColors[0] || {}));
      console.log('zone_colors count:', zoneColors.length);
    }
    
    // Проверяем структуру order_seats
    console.log('\n=== ORDER_SEATS TABLE ===');
    const { data: orderSeats, error: osError } = await supabase
      .from('order_seats')
      .select('*')
      .limit(1);
    
    if (osError) {
      console.log('order_seats table error:', osError.message);
    } else {
      console.log('order_seats exists, sample columns:', Object.keys(orderSeats[0] || {}));
    }
    
    // Проверяем структуру tickets
    console.log('\n=== TICKETS TABLE ===');
    const { data: tickets, error: tError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1);
    
    if (tError) {
      console.log('tickets table error:', tError.message);
    } else {
      console.log('tickets exists, sample columns:', Object.keys(tickets[0] || {}));
    }
    
    // Проверяем события
    console.log('\n=== EVENTS TABLE ===');
    const { data: events, error: evError } = await supabase
      .from('events')
      .select('id, title')
      .limit(5);
    
    if (evError) {
      console.log('events table error:', evError.message);
    } else {
      console.log('events:', events);
    }
    
    // Проверяем места
    console.log('\n=== SEATS TABLE ===');
    const { data: seats, error: seatsError } = await supabase
      .from('seats')
      .select('event_id')
      .eq('event_id', '550e8400-e29b-41d4-a716-446655440000')
      .limit(1);
    
    if (seatsError) {
      console.log('seats table error:', seatsError.message);
    } else {
      console.log('seats linked to event 550e8400-e29b-41d4-a716-446655440000:', seats.length > 0);
    }
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkTableStructures();