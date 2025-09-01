import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют необходимые переменные окружения:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function blockZoneSeats() {
  console.log('🚀 Начинаем блокировку мест в зонах 201 и 213...');
  
  try {
    // Сначала проверим, сколько мест доступно в этих зонах
    const { data: availableSeats, error: checkError } = await supabase
      .from('seats')
      .select('id, zone, row, number, status')
      .in('zone', ['201', '213'])
      .eq('status', 'available');

    if (checkError) {
      console.error('❌ Ошибка при проверке доступных мест:', checkError);
      return;
    }

    console.log(`📊 Найдено ${availableSeats?.length || 0} доступных мест в зонах 201 и 213`);
    
    if (!availableSeats || availableSeats.length === 0) {
      console.log('ℹ️ Нет доступных мест для блокировки');
      return;
    }

    // Группируем по зонам для статистики
    const zone201Count = availableSeats.filter(seat => seat.zone === '201').length;
    const zone213Count = availableSeats.filter(seat => seat.zone === '213').length;
    
    console.log(`📍 Зона 201: ${zone201Count} мест`);
    console.log(`📍 Зона 213: ${zone213Count} мест`);

    // Обновляем статус всех доступных мест в зонах 201 и 213 на 'blocked'
    const { data: updatedSeats, error: updateError } = await supabase
      .from('seats')
      .update({ 
        status: 'blocked',
        updated_at: new Date().toISOString()
      })
      .in('zone', ['201', '213'])
      .eq('status', 'available')
      .select('id, zone, row, number, status');

    if (updateError) {
      console.error('❌ Ошибка при обновлении статуса мест:', updateError);
      return;
    }

    console.log(`✅ Успешно заблокировано ${updatedSeats?.length || 0} мест`);
    
    // Проверяем результат
    const { data: blockedSeats, error: verifyError } = await supabase
      .from('seats')
      .select('zone, status')
      .in('zone', ['201', '213'])
      .eq('status', 'blocked');

    if (verifyError) {
      console.error('❌ Ошибка при проверке результата:', verifyError);
      return;
    }

    const finalZone201Count = blockedSeats?.filter(seat => seat.zone === '201').length || 0;
    const finalZone213Count = blockedSeats?.filter(seat => seat.zone === '213').length || 0;
    
    console.log('\n📊 Итоговая статистика заблокированных мест:');
    console.log(`📍 Зона 201: ${finalZone201Count} заблокированных мест`);
    console.log(`📍 Зона 213: ${finalZone213Count} заблокированных мест`);
    console.log(`🎯 Всего заблокировано: ${finalZone201Count + finalZone213Count} мест`);
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем скрипт
blockZoneSeats().then(() => {
  console.log('\n🏁 Скрипт завершен');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});