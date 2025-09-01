#!/usr/bin/env node

/**
 * Скрипт для проверки статуса мест в зонах 201 и 213
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют необходимые переменные окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkZonesStatus() {
  console.log('🔍 Проверяем статус мест в зонах 201 и 213...');
  
  try {
    // Получаем все места в зонах 201 и 213
    const { data: seats, error } = await supabase
      .from('seats')
      .select('id, zone, row, number, status')
      .in('zone', ['201', '213'])
      .order('zone')
      .order('row')
      .order('number');

    if (error) {
      console.error('❌ Ошибка при получении данных:', error);
      return;
    }

    if (!seats || seats.length === 0) {
      console.log('ℹ️ Места в зонах 201 и 213 не найдены');
      return;
    }

    console.log(`📊 Всего мест найдено: ${seats.length}`);
    
    // Группируем по зонам и статусам
    const stats = seats.reduce((acc, seat) => {
      if (!acc[seat.zone]) {
        acc[seat.zone] = {};
      }
      if (!acc[seat.zone][seat.status]) {
        acc[seat.zone][seat.status] = 0;
      }
      acc[seat.zone][seat.status]++;
      return acc;
    }, {});

    console.log('\n📈 Статистика по зонам:');
    Object.entries(stats).forEach(([zone, statuses]) => {
      console.log(`\n🎯 Зона ${zone}:`);
      Object.entries(statuses).forEach(([status, count]) => {
        const emoji = {
          'available': '🟢',
          'blocked': '🔴',
          'reserved': '🟡',
          'sold': '⚫',
          'unavailable': '⚪'
        }[status] || '❓';
        console.log(`   ${emoji} ${status}: ${count} мест`);
      });
    });

    // Показываем первые несколько мест для примера
    console.log('\n📝 Примеры мест:');
    ['201', '213'].forEach(zone => {
      const zoneSeats = seats.filter(s => s.zone === zone).slice(0, 5);
      if (zoneSeats.length > 0) {
        console.log(`\n   Зона ${zone}:`);
        zoneSeats.forEach(seat => {
          console.log(`     Ряд ${seat.row}, Место ${seat.number}: ${seat.status}`);
        });
        if (seats.filter(s => s.zone === zone).length > 5) {
          console.log(`     ... и еще ${seats.filter(s => s.zone === zone).length - 5} мест`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем скрипт
checkZonesStatus().then(() => {
  console.log('\n🏁 Проверка завершена');
}).catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});