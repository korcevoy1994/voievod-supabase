require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440000';

async function linkTablesToEvent() {
  console.log('Linking all tables to event:', EVENT_ID);
  
  try {
    // 1. Проверим, есть ли event_id колонка в order_payments
    console.log('\n=== CHECKING ORDER_PAYMENTS STRUCTURE ===');
    const { data: orderPaymentsTest, error: opTestError } = await supabase
      .from('order_payments')
      .select('*')
      .limit(1);
    
    if (opTestError) {
      console.log('order_payments error:', opTestError.message);
    } else {
      console.log('order_payments columns:', Object.keys(orderPaymentsTest[0] || {}));
      const hasEventId = orderPaymentsTest[0] && 'event_id' in orderPaymentsTest[0];
      console.log('Has event_id column:', hasEventId);
    }
    
    // 2. Проверим order_seats
    console.log('\n=== CHECKING ORDER_SEATS STRUCTURE ===');
    const { data: orderSeatsTest, error: osTestError } = await supabase
      .from('order_seats')
      .select('*')
      .limit(1);
    
    if (osTestError) {
      console.log('order_seats error:', osTestError.message);
    } else {
      console.log('order_seats columns:', Object.keys(orderSeatsTest[0] || {}));
    }
    
    // 3. Проверим tickets
    console.log('\n=== CHECKING TICKETS STRUCTURE ===');
    const { data: ticketsTest, error: ticketsTestError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1);
    
    if (ticketsTestError) {
      console.log('tickets error:', ticketsTestError.message);
    } else {
      console.log('tickets columns:', Object.keys(ticketsTest[0] || {}));
    }
    
    // 4. Заполним zone_pricing для всех зон
    console.log('\n=== UPDATING ZONE_PRICING ===');
    const zones = [
      { zone: '201', price: 500, name: 'Зона 201' },
      { zone: '202', price: 600, name: 'Зона 202' },
      { zone: '203', price: 700, name: 'Зона 203' },
      { zone: '204', price: 800, name: 'Зона 204' },
      { zone: '205', price: 900, name: 'Зона 205' },
      { zone: '206', price: 1000, name: 'Зона 206' },
      { zone: '207', price: 1100, name: 'Зона 207' },
      { zone: '208', price: 1200, name: 'Зона 208' },
      { zone: '209', price: 1300, name: 'Зона 209' },
      { zone: '210', price: 1400, name: 'Зона 210' },
      { zone: '211', price: 1500, name: 'Зона 211' },
      { zone: '212', price: 1600, name: 'Зона 212' },
      { zone: '213', price: 1700, name: 'Зона 213' }
    ];
    
    // Удалим существующие записи для этого события
    const { error: deleteZpError } = await supabase
      .from('zone_pricing')
      .delete()
      .eq('event_id', EVENT_ID);
    
    if (deleteZpError) {
      console.log('Error deleting zone_pricing:', deleteZpError.message);
    }
    
    // Добавим новые записи
    for (const zone of zones) {
      const { error: insertZpError } = await supabase
        .from('zone_pricing')
        .insert({
          event_id: EVENT_ID,
          zone: zone.zone,
          price: zone.price
        });
      
      if (insertZpError) {
        console.log(`Error inserting zone_pricing for ${zone.zone}:`, insertZpError.message);
      } else {
        console.log(`Added zone_pricing for zone ${zone.zone} with price ${zone.price}`);
      }
    }
    
    // 5. Заполним zone_colors
    console.log('\n=== UPDATING ZONE_COLORS ===');
    const zoneColors = [
      { zone: '201', color: '#4ED784', name: 'Зеленая зона' },
      { zone: '202', color: '#FFD700', name: 'Золотая зона' },
      { zone: '203', color: '#FF6B6B', name: 'Красная зона' },
      { zone: '204', color: '#4ECDC4', name: 'Бирюзовая зона' },
      { zone: '205', color: '#45B7D1', name: 'Синяя зона' },
      { zone: '206', color: '#96CEB4', name: 'Мятная зона' },
      { zone: '207', color: '#FFEAA7', name: 'Желтая зона' },
      { zone: '208', color: '#DDA0DD', name: 'Сиреневая зона' },
      { zone: '209', color: '#98D8C8', name: 'Аквамариновая зона' },
      { zone: '210', color: '#F7DC6F', name: 'Лимонная зона' },
      { zone: '211', color: '#BB8FCE', name: 'Фиолетовая зона' },
      { zone: '212', color: '#85C1E9', name: 'Голубая зона' },
      { zone: '213', color: '#F8C471', name: 'Оранжевая зона' }
    ];
    
    // Удалим существующие записи
    const { error: deleteZcError } = await supabase
      .from('zone_colors')
      .delete()
      .neq('id', 0); // удалим все записи
    
    if (deleteZcError) {
      console.log('Error deleting zone_colors:', deleteZcError.message);
    }
    
    // Добавим новые записи
    for (const zoneColor of zoneColors) {
      const { error: insertZcError } = await supabase
        .from('zone_colors')
        .insert({
          zone: zoneColor.zone,
          color: zoneColor.color,
          name: zoneColor.name
        });
      
      if (insertZcError) {
        console.log(`Error inserting zone_colors for ${zoneColor.zone}:`, insertZcError.message);
      } else {
        console.log(`Added zone_colors for zone ${zoneColor.zone} with color ${zoneColor.color}`);
      }
    }
    
    // 6. Проверим финальное состояние
    console.log('\n=== FINAL CHECK ===');
    const { data: finalZonePricing } = await supabase
      .from('zone_pricing')
      .select('*')
      .eq('event_id', EVENT_ID);
    
    const { data: finalZoneColors } = await supabase
      .from('zone_colors')
      .select('*');
    
    console.log(`Zone pricing records for event: ${finalZonePricing?.length || 0}`);
    console.log(`Zone colors records: ${finalZoneColors?.length || 0}`);
    
    console.log('\n=== COMPLETED ===');
    console.log('All tables have been linked to event:', EVENT_ID);
    
  } catch (error) {
    console.error('Error linking tables to event:', error);
  }
}

linkTablesToEvent();