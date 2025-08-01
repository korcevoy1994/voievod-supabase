require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeatsStructure() {
  try {
    console.log('Checking seats table structure...');
    
    // Проверяем структуру таблицы seats через попытку вставки тестового места
    console.log('\nTrying to insert test seat to understand ID structure...');
    
    // Попробуем вставить место с коротким ID
    const testSeat = {
      id: 'TEST1234',
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      zone: 'TEST',
      row: 'A',
      number: 1,
      price: 100
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('seats')
      .insert([testSeat])
      .select();
    
    if (insertError) {
      console.log('Insert with short ID failed:', insertError.message);
      
      // Попробуем с UUID
      const testSeatUUID = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        zone: 'TEST',
        row: 'A',
        number: 1,
        price: 100
      };
      
      const { data: insertDataUUID, error: insertErrorUUID } = await supabase
        .from('seats')
        .insert([testSeatUUID])
        .select();
      
      if (insertErrorUUID) {
        console.log('Insert with UUID also failed:', insertErrorUUID.message);
      } else {
        console.log('✓ Table uses UUID for ID field');
        console.log('Inserted test seat:', insertDataUUID[0]);
        
        // Удаляем тестовое место
        await supabase.from('seats').delete().eq('id', testSeatUUID.id);
        console.log('Test seat deleted');
      }
    } else {
      console.log('✓ Table uses TEXT/VARCHAR for ID field');
      console.log('Inserted test seat:', insertData[0]);
      
      // Удаляем тестовое место
      await supabase.from('seats').delete().eq('id', testSeat.id);
      console.log('Test seat deleted');
    }
    
    // Проверяем количество мест
    const { count, error: countError } = await supabase
      .from('seats')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting seats:', countError);
    } else {
      console.log(`\nTotal seats in database: ${count || 0}`);
    }
    
    // Проверяем несколько примеров ID
    const { data: sampleSeats, error: sampleError } = await supabase
      .from('seats')
      .select('id, zone, row, number')
      .limit(5);
    
    if (sampleError) {
      console.error('Error getting sample seats:', sampleError);
    } else {
      console.log('\nSample seat IDs:');
      sampleSeats.forEach(seat => {
        console.log(`ID: ${seat.id} | Zone: ${seat.zone} | Row: ${seat.row} | Number: ${seat.number}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSeatsStructure();