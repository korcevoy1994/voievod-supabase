require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440000';

async function loadSeatsData() {
  console.log('Loading seats data for event:', EVENT_ID);
  
  try {
    // Читаем файл с данными мест
    const seatsFile = '/Users/aleksandrkorcevoj/voev/supabase/migrations/20250730120006_import_seats_data.sql.backup';
    const content = fs.readFileSync(seatsFile, 'utf8');
    
    // Извлекаем INSERT statements
    const lines = content.split('\n');
    const insertLines = lines.filter(line => 
      line.trim().startsWith("('") && line.includes(EVENT_ID)
    );
    
    console.log(`Found ${insertLines.length} seat records to insert`);
    
    // Удаляем существующие места для этого события
    console.log('Deleting existing seats...');
    const { error: deleteError } = await supabase
      .from('seats')
      .delete()
      .eq('event_id', EVENT_ID);
    
    if (deleteError) {
      console.error('Error deleting existing seats:', deleteError.message);
      return;
    }
    
    // Парсим и вставляем места пакетами
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < insertLines.length; i += batchSize) {
      const batch = insertLines.slice(i, i + batchSize);
      const seats = [];
      
      for (const line of batch) {
        // Парсим строку INSERT
        const match = line.match(/\('([^']+)', '([^']+)', '([^']+)', '([^']+)', (\d+), (\d+), '([^']+)', (\d+), '([^']+)'\)/);;
        if (match) {
          const [, event_id, zone, row, number, x_coordinate, y_coordinate, status, price, zone_color] = match;
          seats.push({
            event_id,
            zone,
            row,
            number,
            x_coordinate: parseInt(x_coordinate),
            y_coordinate: parseInt(y_coordinate),
            status,
            price: parseInt(price),
            zone_color
          });
        }
      }
      
      if (seats.length > 0) {
        const { error: insertError } = await supabase
          .from('seats')
          .insert(seats);
        
        if (insertError) {
          console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError.message);
          break;
        } else {
          inserted += seats.length;
          console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${seats.length} seats (total: ${inserted})`);
        }
      }
    }
    
    // Обновляем счетчики в событии
    console.log('Updating event counters...');
    const { error: updateError } = await supabase
      .from('events')
      .update({
        total_seats: inserted,
        available_seats: inserted
      })
      .eq('id', EVENT_ID);
    
    if (updateError) {
      console.error('Error updating event counters:', updateError.message);
    } else {
      console.log(`Updated event counters: ${inserted} total seats`);
    }
    
    console.log('\n=== SEATS LOADING COMPLETED ===');
    console.log(`Total seats inserted: ${inserted}`);
    
  } catch (error) {
    console.error('Error loading seats data:', error);
  }
}

loadSeatsData();