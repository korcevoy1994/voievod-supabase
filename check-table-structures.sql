-- Проверка структуры таблиц для event_id связей

-- Проверяем структуру order_payments
SELECT 'order_payments' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_payments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем структуру zone_pricing
SELECT 'zone_pricing' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'zone_pricing' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем структуру zone_colors
SELECT 'zone_colors' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'zone_colors' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем структуру order_seats
SELECT 'order_seats' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_seats' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем структуру tickets
SELECT 'tickets' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем существующие таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Проверяем данные в zone_pricing
SELECT COUNT(*) as zone_pricing_count FROM zone_pricing;

-- Проверяем данные в zone_colors
SELECT COUNT(*) as zone_colors_count FROM zone_colors;

-- Проверяем event_id в существующих таблицах
SELECT 'events' as table_name, id, title FROM events;