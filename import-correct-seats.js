require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const crypto = require('crypto');

const supabase = createClient(supabaseUrl, supabaseKey);

// Функция для генерации UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Функция для проверки уникальности ID
async function isIdUnique(id, existingIds) {
  if (existingIds.has(id)) return false;
  
  const { data } = await supabase
    .from('seats')
    .select('id')
    .eq('id', id)
    .single();
  
  return !data;
}

// Функция для генерации уникального ID
async function generateUniqueShortId(existingIds) {
  let id;
  let attempts = 0;
  do {
    id = generateUUID();
    attempts++;
    if (attempts > 100) {
      throw new Error('Could not generate unique ID after 100 attempts');
    }
  } while (!(await isIdUnique(id, existingIds)));
  
  existingIds.add(id);
  return id;
}

// Функция для парсинга SQL файла и извлечения данных мест
function parseSeatsFromBackup() {
  const backupPath = '/Users/aleksandrkorcevoj/voev/supabase/migrations/20250730120006_import_seats_data.sql.backup';
  const content = fs.readFileSync(backupPath, 'utf8');
  
  const seats = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('(')) {
      // Парсим строку вида: ('550e8400-e29b-41d4-a716-446655440000', '213', 'A', '01', 189, 384, 'available', 500, '#4ED784'),
      const match = line.match(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'([^']+)',\s*(\d+),\s*'([^']+)'\),?/)
      
      if (match) {
        seats.push({
          originalId: `${match[2]}-${match[3]}-${match[4]}`, // Создаем ID из zone-row-number
          eventId: match[1],
          zone: match[2],
          row: match[3],
          number: match[4],
          x_coordinate: parseInt(match[5]),
          y_coordinate: parseInt(match[6]),
          status: match[7],
          price: parseInt(match[8]),
          zone_color: match[9]
        });
      }
    }
  }
  
  console.log(`Parsed ${seats.length} seats from backup file`);
  return seats;
}

async function main() {
  try {
    console.log('Starting import of correct seats data...');
    
    // Парсим данные из backup файла
    const seatsData = parseSeatsFromBackup();
    
    if (seatsData.length === 0) {
      console.error('No seats data found in backup file');
      return;
    }
    
    console.log(`Found ${seatsData.length} seats to import`);
    
    // Удаляем все существующие места
    console.log('Deleting existing seats...');
    const { error: deleteError } = await supabase
      .from('seats')
      .delete()
      .gte('created_at', '1900-01-01');
    
    if (deleteError) {
      console.error('Error deleting existing seats:', deleteError);
      return;
    }
    
    console.log('Existing seats deleted successfully');
    
    // Генерируем новые UUID для всех мест
    console.log('Generating UUIDs for seats...');
    const existingIds = new Set();
    const newSeats = [];
    
    for (let i = 0; i < seatsData.length; i++) {
      const seat = seatsData[i];
      const shortId = await generateUniqueShortId(existingIds);
      
      newSeats.push({
        id: shortId,
        event_id: '550e8400-e29b-41d4-a716-446655440000', // Используем UUID события
        zone: seat.zone,
        row: seat.row,
        number: seat.number,
        x_coordinate: seat.x_coordinate,
        y_coordinate: seat.y_coordinate,
        status: seat.status,
        price: seat.price,
        zone_color: seat.zone_color
      });
      
      if ((i + 1) % 100 === 0) {
        console.log(`Generated ${i + 1}/${seatsData.length} UUIDs`);
      }
    }
    
    console.log('Inserting new seats with UUIDs...');
    
    // Вставляем места батчами по 100
    const batchSize = 100;
    for (let i = 0; i < newSeats.length; i += batchSize) {
      const batch = newSeats.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('seats')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError);
        return;
      }
      
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newSeats.length/batchSize)}`);
    }
    
    console.log(`\n✅ Successfully imported ${newSeats.length} seats with UUIDs!`);
    console.log('All seats now have UUID IDs and are linked to event VOIEVOD1');
    
  } catch (error) {
    console.error('Error during import:', error);
  }
}

main();