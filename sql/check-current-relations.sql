-- SQL скрипт для проверки текущего состояния связей в базе данных
-- Выполните этот скрипт в Supabase SQL Editor для анализа текущих связей

-- Проверяем существующие события
SELECT 
    'СОБЫТИЯ' as section,
    '' as details;
    
SELECT 
    id,
    title,
    venue,
    event_date,
    total_seats,
    available_seats,
    status,
    created_at
FROM events 
ORDER BY created_at DESC;

-- Разделитель
SELECT 
    '===================' as separator;

-- Проверяем места без event_id
SELECT 
    'МЕСТА БЕЗ EVENT_ID' as section,
    COUNT(*) as count
FROM seats 
WHERE event_id IS NULL;

-- Проверяем места с event_id
SELECT 
    'МЕСТА С EVENT_ID' as section,
    e.title as event_title,
    COUNT(s.id) as seats_count
FROM seats s
LEFT JOIN events e ON s.event_id = e.id
WHERE s.event_id IS NOT NULL
GROUP BY e.id, e.title
ORDER BY seats_count DESC;

-- Разделитель
SELECT 
    '===================' as separator;

-- Проверяем заказы без event_id
SELECT 
    'ЗАКАЗЫ БЕЗ EVENT_ID' as section,
    COUNT(*) as count
FROM orders 
WHERE event_id IS NULL;

-- Проверяем заказы с event_id
SELECT 
    'ЗАКАЗЫ С EVENT_ID' as section,
    e.title as event_title,
    COUNT(o.id) as orders_count
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
WHERE o.event_id IS NOT NULL
GROUP BY e.id, e.title
ORDER BY orders_count DESC;

-- Разделитель
SELECT 
    '===================' as separator;

-- Проверяем zone_pricing (с учетом возможного отсутствия event_id)
SELECT 
    'ЗОНЫ ЦЕНООБРАЗОВАНИЯ' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
        THEN 'Таблица имеет event_id'
        ELSE 'Таблица НЕ имеет event_id (старая структура)'
    END as structure_info;

-- Проверяем zone_pricing без event_id (только если колонка существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id') THEN
        RAISE NOTICE 'Проверяем zone_pricing с event_id';
    ELSE
        RAISE NOTICE 'zone_pricing не имеет event_id - показываем общее количество записей';
    END IF;
END $$;

SELECT 
    'ЗОНЫ ЦЕНООБРАЗОВАНИЯ БЕЗ EVENT_ID' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
        THEN (SELECT COUNT(*) FROM zone_pricing WHERE event_id IS NULL)
        ELSE NULL
    END as count;

-- Проверяем zone_pricing с event_id (только если колонка существует)
SELECT 
    'ЗОНЫ ЦЕНООБРАЗОВАНИЯ С EVENT_ID' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
        THEN e.title
        ELSE 'N/A (нет event_id)'
    END as event_title,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
        THEN COUNT(zp.id)
        ELSE (SELECT COUNT(*) FROM zone_pricing)
    END as zones_count
FROM zone_pricing zp
LEFT JOIN events e ON (CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
    THEN zp.event_id = e.id
    ELSE FALSE
END)
WHERE (CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'zone_pricing' AND column_name = 'event_id')
    THEN zp.event_id IS NOT NULL
    ELSE TRUE
END)
GROUP BY e.id, e.title
ORDER BY zones_count DESC;

-- Разделитель
SELECT 
    '===================' as separator;

-- Общая статистика по таблицам
SELECT 
    'ОБЩАЯ СТАТИСТИКА' as section,
    '' as details;

SELECT 
    'events' as table_name,
    COUNT(*) as total_records
FROM events

UNION ALL

SELECT 
    'seats' as table_name,
    COUNT(*) as total_records
FROM seats

UNION ALL

SELECT 
    'orders' as table_name,
    COUNT(*) as total_records
FROM orders

UNION ALL

SELECT 
    'zone_pricing' as table_name,
    COUNT(*) as total_records
FROM zone_pricing

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as total_records
FROM users;

-- Проверяем структуру таблиц (наличие event_id)
SELECT 
    'СТРУКТУРА ТАБЛИЦ' as section,
    '' as details;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('seats', 'orders', 'zone_pricing', 'bookings') 
    AND column_name = 'event_id'
ORDER BY table_name;