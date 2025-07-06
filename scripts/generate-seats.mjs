import fs from 'fs/promises';
import path from 'path';
import { parse } from 'node-html-parser';
import { fileURLToPath } from 'url';

// --- HELPERS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = process.cwd();

// --- CONFIG ---
const ZONE_ID = process.argv[2];
if (!ZONE_ID) {
  console.error('Usage: node scripts/generate-seats.mjs <ZONE_ID>');
  process.exit(1);
}

const SVG_PATH = path.join(CWD, `public/${ZONE_ID}.svg`);
const OUT_PATH = path.join(CWD, `src/data/zone-${ZONE_ID}-seats.ts`);

async function main() {
  try {
    console.log(`Reading SVG from: ${SVG_PATH}`);
    const svgContent = await fs.readFile(SVG_PATH, 'utf-8');
    const root = parse(svgContent);

    const allPaths = root.querySelectorAll('path');
    const fillColors = allPaths.map(p => p.getAttribute('fill')).filter(Boolean);
    const fillColorCounts = fillColors.reduce((acc, color) => {
      if (!color) return acc;
      acc[color.toLowerCase()] = (acc[color.toLowerCase()] || 0) + 1;
      return acc;
    }, {});
    console.log('All fill colors found in SVG:', new Set(fillColors));

    // --- PATHS ---
    // Универсальный выбор цвета мест
    let seatFill = '#8525d9';
    let seatPaths = allPaths.filter(p => p.getAttribute('fill')?.toLowerCase() === seatFill);
    if (seatPaths.length === 0) {
      // Выбираем самый частый не-белый цвет
      const sorted = Object.entries(fillColorCounts)
        .filter(([color]) => color !== 'white' && color !== '#fff' && color !== '#ffffff')
        .sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        seatFill = sorted[0][0];
        seatPaths = allPaths.filter(p => p.getAttribute('fill')?.toLowerCase() === seatFill);
        console.warn(`\n[WARN] Не найдено мест с fill #8525D9. Использую самый частый не-белый цвет: ${seatFill} (${seatPaths.length} path).`);
      }
    }
    console.log(`Found ${seatPaths.length} seat paths with fill ${seatFill}.`);

    // Разделяем path на те, у которых есть id, и те, у которых нет
    const pathsWithId = seatPaths.filter(p => p.getAttribute('id'));
    const pathsWithoutId = seatPaths.filter(p => !p.getAttribute('id'));
    
    console.log(`Paths with id: ${pathsWithId.length}, paths without id: ${pathsWithoutId.length}`);

    // Обрабатываем path с id отдельно
    const pathSeats = [];
    pathsWithId.forEach(p => {
      const id = p.getAttribute('id');
      const { row, number } = parseRowAndNumber(id);
      const d = p.getAttribute('d') || '';
      const match = d.match(/M([\d.-]+)\s*([\d.-]+)/);
      if (match) {
        const x = Math.round(parseFloat(match[1]));
        const y = Math.round(parseFloat(match[2]));
        pathSeats.push({
          id,
          row,
          number,
          x,
          y,
          fill: p.getAttribute('fill') || seatFill
        });
      }
    });

    // Обрабатываем path без id (старый способ - группировка по Y)
    const rowsMap = new Map();
    pathsWithoutId.forEach(p => {
      const d = p.getAttribute('d') || '';
      const match = d.match(/M([\d.-]+)\s*([\d.-]+)/);
      if (match) {
        const x = Math.round(parseFloat(match[1]));
        const y = Math.round(parseFloat(match[2]));
        
        if (!rowsMap.has(y)) {
          rowsMap.set(y, []);
        }
        rowsMap.get(y).push({ x, y });
      }
    });

    // Сортируем ряды по Y-координате
    const sortedRows = Array.from(rowsMap.entries()).sort((a, b) => a[0] - b[0]);
    console.log(`Found ${sortedRows.length} rows from paths without id.`);

    const rowNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let seatData = [];
    
    // Добавляем места из path с id
    pathSeats.forEach(seat => {
      seatData.push(`  { id: '${ZONE_ID}-${seat.row}-${seat.number}', row: '${seat.row}', number: '${seat.number}', x: ${seat.x}, y: ${seat.y}, status: 'available', fill: '${seat.fill}' }`);
    });
    
    // Добавляем места из path без id (старый способ)
    sortedRows.forEach(([, seats], i) => {
      const rowName = rowNames[i];
      // Сортируем места в ряду по X-координате
      seats.sort((a, b) => a.x - b.x);
      
      seats.forEach((seat, j) => {
        const seatNumber = String(j + 1).padStart(2, '0');
        seatData.push(`  { id: '${ZONE_ID}-${rowName}-${seatNumber}', row: '${rowName}', number: '${seatNumber}', x: ${seat.x}, y: ${seat.y}, status: 'available', fill: '${seatFill}' }`);
      });
    });

    // --- CIRCLES/ELLIPSES (например, NS) ---
    const allCircles = root.querySelectorAll('circle');
    const allEllipses = root.querySelectorAll('ellipse');
    const allGroups = root.querySelectorAll('g');
    // Фильтруем только те, у которых есть id (например, K - 01)
    const specialSeats = [];
    function parseRowAndNumber(id) {
      // Пример id: "NS - 01", "K - 01", "A-01", "B_02"
      const m = id.match(/^([A-Z]{1,2})\s*[-_]?\s*(\d{2})/i);
      if (m) return { row: m[1], number: m[2] };
      
      // Если не подошло, попробуем другой формат
      const m2 = id.match(/^([A-Z]{1,2})\s*[-_\s]+(\d{1,2})/i);
      if (m2) return { row: m2[1], number: String(m2[2]).padStart(2, '0') };
      
      return { row: 'NS', number: '00' };
    }
    
    // Группы (например, NS - 01)
    allGroups.forEach(g => {
      const id = g.getAttribute('id');
      if (id && id !== ZONE_ID) {
        const { row, number } = parseRowAndNumber(id);
        // Ищем первый circle в группе для координат
        const firstCircle = g.querySelector('circle');
        if (firstCircle) {
          specialSeats.push({
            id,
            row,
            number,
            x: Math.round(parseFloat(firstCircle.getAttribute('cx') || '0')),
            y: Math.round(parseFloat(firstCircle.getAttribute('cy') || '0')),
            fill: firstCircle.getAttribute('fill') || seatFill,
            type: 'group',
          });
        }
      }
    });
    
    allCircles.forEach(c => {
      const id = c.getAttribute('id');
      if (id && !id.startsWith('Ellipse')) {
        const { row, number } = parseRowAndNumber(id);
        specialSeats.push({
          id,
          row,
          number,
          x: Math.round(parseFloat(c.getAttribute('cx') || '0')),
          y: Math.round(parseFloat(c.getAttribute('cy') || '0')),
          fill: c.getAttribute('fill') || seatFill,
          type: 'circle',
        });
      }
    });

    if (seatPaths.length === 0) {
      console.error('No seats found. Check the fill color in the SVG or the SVG file path.');
      return;
    }

    // Добавляем специальные места (circle/ellipse)
    specialSeats.forEach((s) => {
      seatData.push(`  { id: '${ZONE_ID}-${s.row}-${s.number}', row: '${s.row}', number: '${s.number}', x: ${s.x}, y: ${s.y}, status: 'available', fill: '${s.fill}' }`);
    });

    const fileContent = `// Generated by scripts/generate-seats.mjs
import { SeatStatus } from '@/components/Seat';

export interface SeatData {
  id: string;
  row: string;
  number: string;
  x: number;
  y: number;
  status: 'available' | 'unavailable' | 'selected';
  fill: string; // Цвет из SVG
}

export const zone${ZONE_ID}SeatData: SeatData[] = [
${seatData.join(',\n')}
];
`;

    await fs.writeFile(OUT_PATH, fileContent);
    console.log(`Successfully generated ${OUT_PATH}`);

  } catch (error) {
    console.error('Error generating seat data:', error);
    if (error.code === 'ENOENT') {
      console.error(`\nFile not found: ${SVG_PATH}`);
      console.error('Make sure the SVG file for the specified zone exists in the /public directory.');
    }
  }
}

main(); 