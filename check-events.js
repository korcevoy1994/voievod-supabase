require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEvents() {
  console.log('🔍 Проверка событий в базе данных...');
  
  try {
    // Получаем все события
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('*');
    
    if (allError) {
      console.error('❌ Ошибка при получении всех событий:', allError);
      return;
    }
    
    console.log('📋 Все события:', allEvents);
    
    if (!allEvents || allEvents.length === 0) {
      console.log('⚠️ События не найдены. Создаем тестовое событие...');
      
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Event',
          description: 'Test event for order creation',
          event_date: new Date().toISOString(),
          venue: 'Test Venue',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Ошибка при создании события:', createError);
      } else {
        console.log('✅ Тестовое событие создано:', newEvent);
      }
    } else {
      // Проверяем активные события
      const activeEvents = allEvents.filter(event => event.status === 'active');
      console.log('🟢 Активные события:', activeEvents);
      
      if (activeEvents.length === 0) {
        console.log('⚠️ Нет активных событий. Активируем первое событие...');
        
        const { data: updatedEvent, error: updateError } = await supabase
          .from('events')
          .update({ status: 'active' })
          .eq('id', allEvents[0].id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Ошибка при активации события:', updateError);
        } else {
          console.log('✅ Событие активировано:', updatedEvent);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkEvents();