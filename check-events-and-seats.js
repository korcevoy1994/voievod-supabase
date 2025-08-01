require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEventsAndSeats() {
  try {
    console.log('=== Проверяем события ===');
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*');
    
    if (eventsError) {
      console.error('Ошибка при получении событий:', eventsError);
    } else {
      console.log(`Найдено событий: ${events.length}`);
      events.forEach(event => {
        console.log(`- ${event.title} (ID: ${event.id})`);
      });
    }
    
    console.log('\n=== Проверяем zone_pricing ===');
    
    const { data: zonePricing, error: zonePricingError } = await supabase
      .from('zone_pricing')
      .select('*');
    
    if (zonePricingError) {
      console.error('Ошибка при получении zone_pricing:', zonePricingError);
    } else {
      console.log(`Найдено записей zone_pricing: ${zonePricing.length}`);
      zonePricing.forEach(zp => {
        console.log(`- Зона ${zp.zone}: ${zp.price} MDL (Event ID: ${zp.event_id})`);
      });
    }
    
    console.log('\n=== Проверяем места ===');
    
    const { count: seatsCount, error: seatsCountError } = await supabase
      .from('seats')
      .select('*', { count: 'exact', head: true });
    
    if (seatsCountError) {
      console.error('Ошибка при подсчете мест:', seatsCountError);
    } else {
      console.log(`Общее количество мест: ${seatsCount}`);
    }
    
    // Если есть события, попробуем сгенерировать места
    if (events && events.length > 0) {
      const eventId = events[0].id;
      console.log(`\n=== Попытка генерации мест для события ${eventId} ===`);
      
      const { data: generateResult, error: generateError } = await supabase
        .rpc('generate_seats_for_event', { event_uuid: eventId });
      
      if (generateError) {
        console.error('Ошибка при генерации мест:', generateError);
      } else {
        console.log('Места успешно сгенерированы');
        
        // Проверяем количество мест после генерации
        const { count: newSeatsCount, error: newSeatsCountError } = await supabase
          .from('seats')
          .select('*', { count: 'exact', head: true });
        
        if (!newSeatsCountError) {
          console.log(`Новое количество мест: ${newSeatsCount}`);
        }
      }
    }
    
  } catch (err) {
    console.error('Общая ошибка:', err);
  }
}

checkEventsAndSeats();