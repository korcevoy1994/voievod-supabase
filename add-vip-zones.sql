-- SQL скрипт для добавления VIP зон в базу данных
-- Выполните этот скрипт в вашей базе данных Supabase

-- 1. Добавляем ценообразование для VIP зон
-- Сначала удаляем существующие VIP зоны, если они есть
DELETE FROM "public"."zone_pricing" WHERE "zone" LIKE 'vip%' AND "event_id" = '550e8400-e29b-41d4-a716-446655440000';

-- Затем добавляем новые
INSERT INTO "public"."zone_pricing" ("id", "event_id", "zone", "price", "created_at", "updated_at") VALUES 
-- Все VIP зоны - фиксированная цена за всю зону 12000 лей
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip1', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip2', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip3', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip4', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip5', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip6', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip7', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip8', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip9', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip10', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip11', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip12', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip13', '12000', NOW(), NOW()),
(uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440000', 'vip14', '12000', NOW(), NOW());

-- 2. Добавляем места для VIP зон
-- Сначала удаляем существующие места VIP зон, если они есть
DELETE FROM "public"."seats" WHERE "zone" LIKE 'vip%' AND "event_id" = '550e8400-e29b-41d4-a716-446655440000';

-- VIP зоны будут иметь разное количество мест в зависимости от их размера
-- Количество мест в каждой зоне:
-- VIP 1: 20 мест, VIP 2: 25 мест, VIP 3: 30 мест, VIP 4: 15 мест
-- VIP 5: 18 мест, VIP 6: 12 мест, VIP 7: 35 мест, VIP 8: 35 мест
-- VIP 9: 12 мест, VIP 10: 18 мест, VIP 11: 15 мест, VIP 12: 30 мест
-- VIP 13: 25 мест, VIP 14: 20 мест
-- Общее количество VIP мест: 310

-- VIP 1 (20 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip1',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 20) AS seat_num;

-- VIP 2 (25 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip2',
  '1',
  seat_num::text,
  1200,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 25) AS seat_num;

-- VIP 3 (30 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip3',
  '1',
  seat_num::text,
  1200,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 30) AS seat_num;

-- VIP 4 (15 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip4',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 15) AS seat_num;

-- VIP 5 (18 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip5',
  '1',
  seat_num::text,
  1000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 18) AS seat_num;

-- VIP 6 (12 мест) - передние VIP
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip6',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 12) AS seat_num;

-- VIP 7 (35 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip7',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 35) AS seat_num;

-- VIP 8 (35 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip8',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 35) AS seat_num;

-- VIP 9 (12 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip9',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 12) AS seat_num;

-- VIP 10 (18 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip10',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 18) AS seat_num;

-- VIP 11 (15 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip11',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 15) AS seat_num;

-- VIP 12 (30 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip12',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 30) AS seat_num;

-- VIP 13 (25 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip13',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 25) AS seat_num;

-- VIP 14 (20 мест)
INSERT INTO "public"."seats" ("id", "event_id", "zone", "row", "number", "price", "status", "created_at", "updated_at") 
SELECT 
  uuid_generate_v4(),
  '550e8400-e29b-41d4-a716-446655440000',
  'vip14',
  '1',
  seat_num::text,
  12000,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 20) AS seat_num;

-- 3. Добавляем цвета для VIP зон (если таблица zone_colors существует)
-- Сначала удаляем существующие VIP зоны, если они есть
DELETE FROM "public"."zone_colors" WHERE "zone" LIKE 'vip%';

-- Затем добавляем новые
INSERT INTO "public"."zone_colors" ("id", "zone", "color", "name", "created_at", "updated_at") VALUES 
(uuid_generate_v4(), 'vip1', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip2', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip3', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip4', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip5', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip6', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip7', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip8', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip9', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip10', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip11', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip12', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip13', '#1B1792', 'VIP Blue', NOW(), NOW()),
(uuid_generate_v4(), 'vip14', '#1B1792', 'VIP Blue', NOW(), NOW());

-- Проверяем результат
SELECT 
  zp.zone,
  zp.price,
  COUNT(s.id) as total_seats,
  COUNT(CASE WHEN s.status = 'available' THEN 1 END) as available_seats
FROM zone_pricing zp
LEFT JOIN seats s ON s.zone = zp.zone AND s.event_id = zp.event_id
WHERE zp.zone LIKE 'vip%' AND zp.event_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY zp.zone, zp.price
ORDER BY zp.zone;

-- Итоговая статистика
SELECT 
  'VIP Zones Total' as summary,
  COUNT(DISTINCT zp.zone) as total_vip_zones,
  SUM(CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END) as total_vip_seats,
  AVG(zp.price::numeric) as average_price
FROM zone_pricing zp
LEFT JOIN seats s ON s.zone = zp.zone AND s.event_id = zp.event_id
WHERE zp.zone LIKE 'vip%' AND zp.event_id = '550e8400-e29b-41d4-a716-446655440000';