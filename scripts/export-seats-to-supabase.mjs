#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к папке с данными
const dataDir = path.join(__dirname, '../src/data');
const outputFile = path.join(__dirname, '../supabase-seats-export.sql');

// ID события для которого экспортируем места
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440000';

// Функция для получения цены места на основе зоны
function getSeatPrice(zone) {
  const zonePrices = {
    '201': 500,
    '202': 600,
    '203': 700,
    '204': 800,
    '205': 450,
    '206': 550,
    '207': 550,
    '208': 550,
    '209': 450,
    '210': 700,
    '211': 700,
    '212': 600,
    '213': 500
  };
  return zonePrices[zone] || 500;
}

// Функция для импорта данных из TypeScript файла
async function importSeatData(filePath) {
  try {
    // Читаем содержимое файла
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Извлекаем массив данных с помощью регулярного выражения
    const arrayMatch = content.match(/export const zone\d+SeatData: SeatData\[\] = (\[[\s\S]*?\]);/);
    if (!arrayMatch) {
      console.error(`Не удалось найти массив данных в файле ${filePath}`);
      return [];
    }
    
    // Парсим JSON (заменяем одинарные кавычки на двойные)
    const arrayString = arrayMatch[1]
      .replace(/'/g, '"')
      .replace(/([a-zA-Z_][a-zA-Z0-9_]*):(?=\s*[^\s])/g, '"$1":'); // Добавляем кавычки к ключам
    
    const seatData = JSON.parse(arrayString);
    return seatData;
  } catch (error) {
    console.error(`Ошибка при импорте данных из ${filePath}:`, error);
    return [];
  }
}

// Основная функция
async function exportSeatsToSupabase() {
  console.log('Начинаем экспорт мест в Supabase...');
  
  let allSeats = [];
  let totalSeats = 0;
  
  // Читаем все файлы с данными о зонах
  const files = fs.readdirSync(dataDir).filter(file => 
    file.startsWith('zone-') && file.endsWith('-seats.ts')
  );
  
  console.log(`Найдено ${files.length} файлов с данными о зонах`);
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const zoneMatch = file.match(/zone-(\d+)-seats\.ts/);
    
    if (!zoneMatch) {
      console.warn(`Не удалось извлечь номер зоны из файла ${file}`);
      continue;
    }
    
    const zone = zoneMatch[1];
    console.log(`Обрабатываем зону ${zone}...`);
    
    const seatData = await importSeatData(filePath);
    
    if (seatData.length === 0) {
      console.warn(`Нет данных для зоны ${zone}`);
      continue;
    }
    
    // Преобразуем данные для Supabase
    const supabaseSeats = seatData.map(seat => {
      const price = getSeatPrice(zone);
      return {
        id: seat.id,
        event_id: EVENT_ID,
        zone: zone,
        row: seat.row,
        number: seat.number,
        x: seat.x,
        y: seat.y,
        status: 'available',
        price: price,
        zone_color: seat.fill
      };
    });
    
    allSeats = allSeats.concat(supabaseSeats);
    totalSeats += seatData.length;
    
    console.log(`Зона ${zone}: ${seatData.length} мест`);
  }
  
  console.log(`\nВсего мест для экспорта: ${totalSeats}`);
  
  // Генерируем SQL
  let sql = `-- Экспорт мест в Supabase\n`;
  sql += `-- Всего мест: ${totalSeats}\n`;
  sql += `-- Событие: ${EVENT_ID}\n\n`;
  
  sql += `-- Удаляем существующие места для этого события\n`;
  sql += `DELETE FROM seats WHERE event_id = '${EVENT_ID}';\n\n`;
  
  sql += `-- Вставляем новые места\n`;
  sql += `INSERT INTO seats (event_id, zone, row, number, x_coordinate, y_coordinate, status, price, zone_color) VALUES\n`;
  
  const values = allSeats.map(seat => 
    `('${seat.event_id}', '${seat.zone}', '${seat.row}', '${seat.number}', ${seat.x}, ${seat.y}, '${seat.status}', ${seat.price}, '${seat.zone_color}')`
  );
  
  sql += values.join(',\n');
  sql += ';\n\n';
  
  // Обновляем счетчики в таблице events
  sql += `-- Обновляем счетчики мест в событии\n`;
  sql += `UPDATE events SET \n`;
  sql += `  total_seats = ${totalSeats},\n`;
  sql += `  available_seats = ${totalSeats}\n`;
  sql += `WHERE id = '${EVENT_ID}';\n`;
  
  // Записываем SQL в файл
  fs.writeFileSync(outputFile, sql);
  
  console.log(`\nSQL файл создан: ${outputFile}`);
  console.log(`Для импорта выполните этот файл в Supabase SQL Editor`);
  
  // Статистика по зонам
  const zoneStats = {};
  allSeats.forEach(seat => {
    if (!zoneStats[seat.zone]) {
      zoneStats[seat.zone] = 0;
    }
    zoneStats[seat.zone]++;
  });
  
  console.log('\nСтатистика по зонам:');
  Object.keys(zoneStats).sort().forEach(zone => {
    console.log(`Зона ${zone}: ${zoneStats[zone]} мест`);
  });
}

// Запускаем экспорт
exportSeatsToSupabase().catch(console.error);