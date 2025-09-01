-- SQL скрипт для добавления колонки event_id в таблицу zone_pricing
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем текущую структуру таблицы zone_pricing
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'zone_pricing'
ORDER BY ordinal_position;

-- Добавляем колонку event_id если она не существует
ALTER TABLE zone_pricing 
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Добавляем внешний ключ на events (только если не существует)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_zone_pricing_event_id' 
        AND table_name = 'zone_pricing'
    ) THEN
        ALTER TABLE zone_pricing 
        ADD CONSTRAINT fk_zone_pricing_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_zone_pricing_event_id 
ON zone_pricing(event_id);

-- Обновляем существующие записи, устанавливая event_id
-- Используем первое доступное событие или создаем новое
DO $$
DECLARE
    default_event_id UUID;
BEGIN
    -- Пытаемся найти существующее событие
    SELECT id INTO default_event_id 
    FROM events 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Если событий нет, создаем событие с правильным ID
    IF default_event_id IS NULL THEN
        INSERT INTO events (id, title, description, venue, event_date, doors_open, status, image_url) 
        VALUES (
            '88cbf7ee-71ac-46e0-938c-44d617ccbf82',
            'Voievod Concert',
            'Концерт группы Voievod в Ледовом дворце',
            'Ледовый дворец "Арена"',
            '2024-12-31 20:00:00+03',
            '2024-12-31 19:00:00+03',
            'active',
            '/arena.svg'
        )
        ON CONFLICT (id) DO NOTHING;
        
        default_event_id := '88cbf7ee-71ac-46e0-938c-44d617ccbf82';
    END IF;
    
    -- Обновляем все записи zone_pricing без event_id
    UPDATE zone_pricing 
    SET event_id = default_event_id
    WHERE event_id IS NULL;
    
    RAISE NOTICE 'Обновлено записей zone_pricing: %', 
        (SELECT COUNT(*) FROM zone_pricing WHERE event_id = default_event_id);
END $$;

-- Делаем event_id обязательным после заполнения данных
ALTER TABLE zone_pricing 
ALTER COLUMN event_id SET NOT NULL;

-- Создаем уникальный индекс для предотвращения дублирования
CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_pricing_event_zone 
ON zone_pricing(event_id, zone);

-- Проверяем результат
SELECT 
    'zone_pricing структура обновлена' as message,
    COUNT(*) as total_records,
    COUNT(DISTINCT event_id) as unique_events
FROM zone_pricing;

-- Показываем данные для правильного события
SELECT 
    zone,
    price,
    row_multipliers,
    event_id
FROM zone_pricing 
WHERE event_id = '88cbf7ee-71ac-46e0-938c-44d617ccbf82'
ORDER BY zone;