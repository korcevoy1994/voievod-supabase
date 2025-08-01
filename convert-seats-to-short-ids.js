const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Функция для генерации короткого ID
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Функция для проверки уникальности ID
async function generateUniqueShortId() {
  let id;
  let isUnique = false;
  
  while (!isUnique) {
    id = generateShortId();
    const { data } = await supabase
      .from('seats')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!data) {
      isUnique = true;
    }
  }
  
  return id;
}

async function convertSeatsToShortIds() {
  try {
    console.log('Начинаем конвертацию seat ID в короткие идентификаторы...');
    
    // Получаем все места
    const { data: seats, error: fetchError } = await supabase
      .from('seats')
      .select('*')
      .order('zone')
      .order('row')
      .order('number');
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`Найдено ${seats.length} мест для конвертации`);
    
    // Создаем массив для новых мест с короткими ID
    const newSeats = [];
    
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      const newId = await generateUniqueShortId();
      
      newSeats.push({
        id: newId,
        event_id: 'VOIEVOD1', // Используем короткий ID события
        zone: seat.zone,
        row: seat.row,
        number: seat.number,
        x_coordinate: seat.x_coordinate,
        y_coordinate: seat.y_coordinate,
        status: seat.status,
        price: seat.price,
        zone_color: seat.zone_color,
        created_at: seat.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if ((i + 1) % 50 === 0) {
        console.log(`Обработано ${i + 1}/${seats.length} мест`);
      }
    }
    
    console.log('Удаляем старые места...');
    
    // Удаляем все старые места
    const { error: deleteError } = await supabase
      .from('seats')
      .delete()
      .gte('created_at', '1900-01-01'); // Удаляем все записи
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log('Вставляем новые места с короткими ID...');
    
    // Вставляем новые места пакетами по 100
    const batchSize = 100;
    for (let i = 0; i < newSeats.length; i += batchSize) {
      const batch = newSeats.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('seats')
        .insert(batch);
      
      if (insertError) {
        throw insertError;
      }
      
      console.log(`Вставлено ${Math.min(i + batchSize, newSeats.length)}/${newSeats.length} мест`);
    }
    
    console.log('✅ Конвертация завершена успешно!');
    console.log(`Всего обработано: ${newSeats.length} мест`);
    
    // Проверяем результат
    const { data: finalSeats, error: finalError } = await supabase
      .from('seats')
      .select('id, zone, row, number')
      .limit(5);
    
    if (finalError) {
      throw finalError;
    }
    
    console.log('Примеры новых seat ID:');
    finalSeats.forEach(seat => {
      console.log(`- ${seat.id} (${seat.zone}-${seat.row}-${seat.number})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при конвертации:', error);
    process.exit(1);
  }
}

convertSeatsToShortIds();