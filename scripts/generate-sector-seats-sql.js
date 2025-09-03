// Скрипт для генерации SQL INSERT запросов для новых секторов A, B, C
// Читает данные напрямую из TypeScript файлов

import fs from 'fs';
import path from 'path';

// Функция для извлечения данных из TypeScript файла
function extractSeatDataFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Извлекаем массив данных мест из файла
  const arrayMatch = content.match(/export const \w+SeatData: SeatData\[\] = \[(.*?)\];/s);
  if (!arrayMatch) {
    throw new Error(`Не удалось найти данные мест в файле ${filePath}`);
  }
  
  // Парсим объекты мест
  const arrayContent = arrayMatch[1];
  const seatMatches = arrayContent.match(/\{[\s\S]*?\}/g) || [];
  
  const seats = [];
  seatMatches.forEach(seatStr => {
    const idMatch = seatStr.match(/id: '([^']+)'/);
    const rowMatch = seatStr.match(/row: '([^']+)'/);
    const numberMatch = seatStr.match(/number: ([\d]+)/);
    const xMatch = seatStr.match(/x: ([\d.]+)/);
    const yMatch = seatStr.match(/y: ([\d.]+)/);
    
    if (idMatch && rowMatch && numberMatch && xMatch && yMatch) {
      seats.push({
        id: idMatch[1],
        row: rowMatch[1],
        number: parseInt(numberMatch[1]),
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1])
      });
    }
  });
  
  return seats;
}

// Загружаем данные из файлов
const zoneSectorASeatData = extractSeatDataFromFile('./src/data/zone-sector-a-seats.ts');
const zoneSectorBSeatData = extractSeatDataFromFile('./src/data/zone-sector-b-seats.ts');
const zoneSectorCSeatData = extractSeatDataFromFile('./src/data/zone-sector-c-seats.ts');

// Цены для секторов (можно настроить)
const SECTOR_PRICES = {
  'A': 150.00,
  'B': 120.00,
  'C': 100.00
};

// Функция для генерации SQL INSERT для одного сектора
function generateSectorSQL(sectorData, sectorName) {
  const price = SECTOR_PRICES[sectorName];
  const sqlStatements = [];
  
  sectorData.forEach((seat, index) => {
    const zone = sectorName;
    const row = seat.row;
    const number = seat.number;
    const x_coordinate = seat.x;
    const y_coordinate = seat.y;
    
    // Убираем id из INSERT - позволяем базе данных автогенерировать UUID
    const sql = `INSERT INTO public.seats (zone, row, number, price, x_coordinate, y_coordinate) VALUES ('${zone}', '${row}', '${number}', ${price}, ${x_coordinate}, ${y_coordinate});`;
    sqlStatements.push(sql);
  });
  
  return sqlStatements;
}

// Генерируем SQL для всех секторов
function generateAllSectorsSQL() {
  const allSQL = [];
  
  // Добавляем комментарий
  allSQL.push('-- SQL INSERT запросы для новых секторов A, B, C');
  allSQL.push('-- Сгенерировано автоматически из данных TypeScript');
  allSQL.push('');
  
  // Сектор A
  allSQL.push('-- Сектор A');
  const sectorASQL = generateSectorSQL(zoneSectorASeatData, 'A');
  allSQL.push(...sectorASQL);
  allSQL.push('');
  
  // Сектор B
  allSQL.push('-- Сектор B');
  const sectorBSQL = generateSectorSQL(zoneSectorBSeatData, 'B');
  allSQL.push(...sectorBSQL);
  allSQL.push('');
  
  // Сектор C
  allSQL.push('-- Сектор C');
  const sectorCSQL = generateSectorSQL(zoneSectorCSeatData, 'C');
  allSQL.push(...sectorCSQL);
  allSQL.push('');
  
  return allSQL.join('\n');
}

// Основная функция
function main() {
  try {
    console.log('Генерация SQL INSERT запросов для секторов A, B, C...');
    
    const sqlContent = generateAllSectorsSQL();
    
    // Сохраняем в файл
    const outputPath = './public/sector-seats-insert.sql';
    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    
    console.log(`✅ SQL файл сохранен: ${outputPath}`);
    console.log(`📊 Статистика:`);
    console.log(`   - Сектор A: ${zoneSectorASeatData.length} мест`);
    console.log(`   - Сектор B: ${zoneSectorBSeatData.length} мест`);
    console.log(`   - Сектор C: ${zoneSectorCSeatData.length} мест`);
    console.log(`   - Всего: ${zoneSectorASeatData.length + zoneSectorBSeatData.length + zoneSectorCSeatData.length} мест`);
    
  } catch (error) {
    console.error('❌ Ошибка при генерации SQL:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAllSectorsSQL };