import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = process.cwd();

// Путь к директории с данными о местах
const DATA_DIR = path.join(CWD, 'src/data');
const OUTPUT_FILE = path.join(CWD, 'supabase-seats-export.sql');

// Функция для извлечения данных о местах из TypeScript файла
function extractSeatDataFromFile(content) {
  // Ищем массив данных о местах
  const match = content.match(/export const zone\d+SeatData: SeatData\[\] = \[([\s\S]*?)\];/);
  if (!match) {
    throw new Error('Не удалось найти данные о местах в файле');
  }

  const seatDataString = match[1];
  const seats = [];

  // Парсим каждое место
  const seatMatches = seatDataString.matchAll(/\{\s*id:\s*'([^']+)',\s*row:\s*'([^']+)',\s*number:\s*'([^']+)',\s*x:\s*(\d+),\s*y:\s*(\d+),\s*status:\s*'([^']+)',\s*fill:\s*'([^']+)'\s*\}/g);
  
  for (const seatMatch of seatMatches) {
    const [, id, row, number, x, y, status, fill] = seatMatch;
    seats.push({
      id,
      row,
      number,
      x: parseInt(x),
      y: parseInt(y),
      status,
      fill
    });
  }

  return seats;
}

// Функция для генерации SQL INSERT запросов
function generateSeatInsertSQL(seats, zoneId, eventId = '550e8400-e29b-41d4-a716-446655440000') {
  if (seats.length === 0) {
    return '';
  }

  // Отслеживаем уже использованные комбинации row+number для генерации уникальных номеров
  const usedCombinations = new Set();
  
  const values = seats.map(seat => {
    let uniqueRow = seat.row;
    let uniqueNumber = seat.number;
    let combination = `${uniqueRow}-${uniqueNumber}`;
    
    // Если комбинация уже используется, генерируем уникальную
    if (usedCombinations.has(combination)) {
      let counter = 1;
      do {
        // Для дублирующихся мест добавляем суффикс к номеру
        uniqueNumber = `${seat.number}_${counter}`;
        combination = `${uniqueRow}-${uniqueNumber}`;
        counter++;
      } while (usedCombinations.has(combination));
    }
    
    usedCombinations.add(combination);
    
    // Генерируем UUID для каждого места
    const seatUuid = `uuid_generate_v4()`;
    return `(${seatUuid}, '${eventId}', '${zoneId}', '${uniqueRow}', '${uniqueNumber}', NULL, FALSE, '${seat.status}', ${seat.x}, ${seat.y})`;
  }).join(',\n  ');

  return `-- Места для зоны ${zoneId}\nINSERT INTO seats (id, event_id, zone, row, number, price, custom_price, status, x_coordinate, y_coordinate) VALUES\n  ${values};\n\n`;
}

async function main() {
  try {
    console.log('Начинаю экспорт данных о местах в Supabase...');
    
    // Читаем все файлы в директории data
    const files = await fs.readdir(DATA_DIR);
    const seatFiles = files.filter(file => file.startsWith('zone-') && file.endsWith('-seats.ts'));
    
    console.log(`Найдено ${seatFiles.length} файлов с данными о местах:`);
    seatFiles.forEach(file => console.log(`  - ${file}`));
    
    let allSQL = `-- Экспорт всех мест в Supabase\n-- Сгенерировано автоматически скриптом export-seats-to-supabase.mjs\n-- Дата: ${new Date().toISOString()}\n\n`;
    
    let totalSeats = 0;
    
    for (const file of seatFiles) {
      // Извлекаем ID зоны из имени файла (например, zone-201-seats.ts -> 201)
      const zoneIdMatch = file.match(/zone-(\d+)-seats\.ts/);
      if (!zoneIdMatch) {
        console.warn(`Пропускаю файл с неправильным форматом имени: ${file}`);
        continue;
      }
      
      const zoneId = parseInt(zoneIdMatch[1]);
      const filePath = path.join(DATA_DIR, file);
      
      console.log(`Обрабатываю зону ${zoneId}...`);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const seats = extractSeatDataFromFile(content);
        
        console.log(`  Найдено ${seats.length} мест`);
        totalSeats += seats.length;
        
        const sql = generateSeatInsertSQL(seats, zoneId);
        allSQL += sql;
        
      } catch (error) {
        console.error(`Ошибка при обработке файла ${file}:`, error.message);
      }
    }
    
    // Записываем SQL в файл
    await fs.writeFile(OUTPUT_FILE, allSQL);
    
    console.log(`\n✅ Экспорт завершен!`);
    console.log(`📊 Всего обработано мест: ${totalSeats}`);
    console.log(`📄 SQL файл создан: ${OUTPUT_FILE}`);
    console.log(`\n🚀 Для импорта в Supabase выполните:`);
    console.log(`   1. Откройте Supabase SQL Editor`);
    console.log(`   2. Скопируйте содержимое файла ${path.basename(OUTPUT_FILE)}`);
    console.log(`   3. Выполните SQL запрос`);
    
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
    process.exit(1);
  }
}

main();