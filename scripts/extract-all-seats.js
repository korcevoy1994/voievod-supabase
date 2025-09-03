const fs = require('fs');
const path = require('path');

// Функция для извлечения координат из атрибута d
function extractCoordinatesFromPath(dAttribute) {
  // Ищем команды M (moveTo) которые обычно содержат начальные координаты
  const moveToMatch = dAttribute.match(/M\s*([0-9.]+)\s*([0-9.]+)/);
  if (moveToMatch) {
    return {
      x: parseFloat(moveToMatch[1]),
      y: parseFloat(moveToMatch[2])
    };
  }
  return { x: 0, y: 0 };
}

// Функция для извлечения данных мест из SVG файла
function extractSeatsFromSVG(filePath, sectorPrefix) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Регулярное выражение для поиска всех path элементов с id
  const pathRegex = /<path[^>]+id="([^"]+)"[^>]*d="([^"]+)"/g;
  const seats = [];
  let match;
  
  while ((match = pathRegex.exec(content)) !== null) {
    const seatId = match[1];
    const dAttribute = match[2];
    
    // Пропускаем одиночные буквы (обозначения рядов)
    if (seatId.length <= 1) continue;
    
    // Обрабатываем только ID в формате "РЯД - НОМЕР"
    if (!seatId.includes(' - ')) continue;
    
    const coordinates = extractCoordinatesFromPath(dAttribute);
    
    // Парсим ID места
    const [row, number] = seatId.split(' - ');
    
    seats.push({
      id: `${sectorPrefix}-${seatId.replace(' - ', '-')}`,
      row: row,
      number: parseInt(number),
      x: coordinates.x,
      y: coordinates.y,
      status: 'available',
      fill: '#E7CB15'
    });
  }
  
  return seats.sort((a, b) => {
    // Сортируем по ряду, затем по номеру
    if (a.row !== b.row) {
      return a.row.localeCompare(b.row);
    }
    return a.number - b.number;
  });
}

// Функция для создания TypeScript файла с данными мест
function createSeatDataFile(seats, fileName, exportName) {
  const content = `import { SeatData } from '../types/seat';

export const ${exportName}: SeatData[] = [
${seats.map(seat => 
  `  {
    id: '${seat.id}',
    row: '${seat.row}',
    number: ${seat.number},
    x: ${seat.x},
    y: ${seat.y},
    status: '${seat.status}',
    fill: '${seat.fill}'
  }`
).join(',\n')}
];
`;
  
  fs.writeFileSync(fileName, content);
  console.log(`Создан файл ${fileName} с ${seats.length} местами`);
}

// Основная функция
function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  
  // Извлекаем места из каждого сектора
  const sectorASeats = extractSeatsFromSVG(path.join(publicDir, 'Sector A.svg'), 'A');
  const sectorBSeats = extractSeatsFromSVG(path.join(publicDir, 'Sector B.svg'), 'B');
  const sectorCSeats = extractSeatsFromSVG(path.join(publicDir, 'Sector C.svg'), 'C');
  
  console.log(`Сектор A: ${sectorASeats.length} мест`);
  console.log(`Сектор B: ${sectorBSeats.length} мест`);
  console.log(`Сектор C: ${sectorCSeats.length} мест`);
  console.log(`Всего: ${sectorASeats.length + sectorBSeats.length + sectorCSeats.length} мест`);
  
  // Создаем файлы данных
  createSeatDataFile(sectorASeats, path.join(dataDir, 'zone-sector-a-seats.ts'), 'zoneSectorASeatData');
  createSeatDataFile(sectorBSeats, path.join(dataDir, 'zone-sector-b-seats.ts'), 'zoneSectorBSeatData');
  createSeatDataFile(sectorCSeats, path.join(dataDir, 'zone-sector-c-seats.ts'), 'zoneSectorCSeatData');
  
  console.log('\nВсе файлы данных мест созданы успешно!');
}

main();