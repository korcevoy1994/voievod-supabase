-- SQL скрипт для связывания всех существующих данных с событием Voievod
-- Выполните этот скрипт в Supabase SQL Editor ПОСЛЕ создания события Voievod

-- Сначала получаем ID созданного события Voievod
DO $$
DECLARE
    voievod_event_id UUID;
BEGIN
    -- Получаем ID события Voievod
    SELECT id INTO voievod_event_id 
    FROM events 
    WHERE title = 'Voievod' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Проверяем, что событие найдено
    IF voievod_event_id IS NULL THEN
        RAISE EXCEPTION 'Событие Voievod не найдено. Сначала выполните create-voievod-event.sql';
    END IF;
    
    RAISE NOTICE 'Найдено событие Voievod с ID: %', voievod_event_id;
    
    -- Обновляем все места (seats), связывая их с событием Voievod
    UPDATE seats 
    SET event_id = voievod_event_id
    WHERE event_id IS NULL OR event_id != voievod_event_id;
    
    RAISE NOTICE 'Обновлено мест: %', (SELECT COUNT(*) FROM seats WHERE event_id = voievod_event_id);
    
    -- Обновляем все заказы (orders), связывая их с событием Voievod
    UPDATE orders 
    SET event_id = voievod_event_id
    WHERE event_id IS NULL OR event_id != voievod_event_id;
    
    RAISE NOTICE 'Обновлено заказов: %', (SELECT COUNT(*) FROM orders WHERE event_id = voievod_event_id);
    
    -- Обновляем zone_pricing, связывая с событием Voievod (если колонка event_id существует)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'zone_pricing' AND column_name = 'event_id'
    ) THEN
        UPDATE zone_pricing 
        SET event_id = voievod_event_id
        WHERE event_id IS NULL OR event_id != voievod_event_id;
        
        RAISE NOTICE 'Обновлено зон ценообразования: %', (SELECT COUNT(*) FROM zone_pricing WHERE event_id = voievod_event_id);
    ELSE
        RAISE NOTICE 'Таблица zone_pricing не имеет колонки event_id, пропускаем обновление';
    END IF;
    
    -- Если существует таблица bookings, обновляем и её
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        UPDATE bookings 
        SET event_id = voievod_event_id
        WHERE event_id IS NULL OR event_id != voievod_event_id;
        
        RAISE NOTICE 'Обновлено бронирований: %', (SELECT COUNT(*) FROM bookings WHERE event_id = voievod_event_id);
    END IF;
    
    -- Обновляем счетчики мест в событии
    UPDATE events 
    SET 
        total_seats = (SELECT COUNT(*) FROM seats WHERE event_id = voievod_event_id),
        available_seats = (SELECT COUNT(*) FROM seats WHERE event_id = voievod_event_id AND status = 'available')
    WHERE id = voievod_event_id;
    
    RAISE NOTICE 'Обновлены счетчики мест для события Voievod';
    
END $$;

-- Проверяем результаты связывания
SELECT 
    'События' as table_name,
    COUNT(*) as count
FROM events 
WHERE title = 'Voievod'

UNION ALL

SELECT 
    'Места' as table_name,
    COUNT(*) as count
FROM seats s
JOIN events e ON s.event_id = e.id
WHERE e.title = 'Voievod'

UNION ALL

SELECT 
    'Заказы' as table_name,
    COUNT(*) as count
FROM orders o
JOIN events e ON o.event_id = e.id
WHERE e.title = 'Voievod'

UNION ALL

SELECT 
    'Зоны ценообразования' as table_name,
    (SELECT COUNT(*) FROM zone_pricing) as count;

-- Дополнительная информация о зонах ценообразования
DO $$
DECLARE
    zone_count INTEGER;
    has_event_id BOOLEAN;
BEGIN
    -- Проверяем наличие колонки event_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'zone_pricing' AND column_name = 'event_id'
    ) INTO has_event_id;
    
    IF has_event_id THEN
        -- Если есть event_id, считаем связанные с событием Voievod
        SELECT COUNT(*) INTO zone_count
        FROM zone_pricing zp 
        JOIN events e ON zp.event_id = e.id 
        WHERE e.title = 'Voievod';
        
        RAISE NOTICE 'Зоны ценообразования связанные с Voievod: %', zone_count;
    ELSE
        -- Если нет event_id, считаем общее количество
        SELECT COUNT(*) INTO zone_count FROM zone_pricing;
        RAISE NOTICE 'Общее количество зон ценообразования (без привязки к событиям): %', zone_count;
    END IF;
END $$;

-- Показываем обновленную информацию о событии
SELECT 
    id,
    title,
    venue,
    event_date,
    total_seats,
    available_seats,
    status
FROM events 
WHERE title = 'Voievod'
ORDER BY created_at DESC
LIMIT 1;