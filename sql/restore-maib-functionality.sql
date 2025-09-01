-- Восстановление функциональности MAIB платежей
-- Этот скрипт создает необходимые данные для корректной работы системы

-- Удаляем существующие тестовые данные
DELETE FROM events WHERE title = 'Voievod';
DELETE FROM users WHERE email = 'test@example.com';

-- Создаем активное событие для тестирования
INSERT INTO events (
  id,
  title,
  description,
  venue,
  event_date,
  doors_open,
  status,
  total_seats,
  available_seats,
  image_url
) VALUES (
  gen_random_uuid(),
  'Voievod',
  'Heavy metal concert featuring the legendary Canadian band Voievod',
  'Sala Palatului',
  '2024-12-31 20:00:00+00',
  '2024-12-31 19:00:00+00',
  'active',
  2000,
  1950,
  'https://example.com/voievod-poster.jpg'
);

-- Создаем индексы для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);

-- Создаем тестового пользователя (опционально)
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  is_temporary
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  '+373 69 123 456',
  false
);

-- Добавляем зоны и цены для тестирования (если их нет)
INSERT INTO zone_pricing (zone, price, event_id)
SELECT 
  'VIP',
  500.00,
  e.id
FROM events e 
WHERE e.title = 'Voievod'
AND NOT EXISTS (
  SELECT 1 FROM zone_pricing zp 
  WHERE zp.zone = 'VIP' AND zp.event_id = e.id
);

INSERT INTO zone_pricing (zone, price, event_id)
SELECT 
  'Standard',
  250.00,
  e.id
FROM events e 
WHERE e.title = 'Voievod'
AND NOT EXISTS (
  SELECT 1 FROM zone_pricing zp 
  WHERE zp.zone = 'Standard' AND zp.event_id = e.id
);

-- Добавляем цвета зон (если их нет)
INSERT INTO zone_colors (zone, color, name)
SELECT 'VIP', '#FFD700', 'VIP Zone'
WHERE NOT EXISTS (SELECT 1 FROM zone_colors WHERE zone = 'VIP');

INSERT INTO zone_colors (zone, color, name)
SELECT 'Standard', '#87CEEB', 'Standard Zone'
WHERE NOT EXISTS (SELECT 1 FROM zone_colors WHERE zone = 'Standard');

-- Создаем несколько тестовых мест (если их нет)
DO $$
DECLARE
    event_uuid UUID;
    seat_counter INTEGER := 1;
BEGIN
    -- Получаем ID события Voievod
    SELECT id INTO event_uuid FROM events WHERE title = 'Voievod' LIMIT 1;
    
    IF event_uuid IS NOT NULL THEN
        -- Создаем места для VIP зоны
        WHILE seat_counter <= 10 LOOP
            INSERT INTO seats (
                zone, row, number, price, status, event_id, x_coordinate, y_coordinate, zone_color
            )
            SELECT 
                'VIP',
                'A',
                seat_counter::VARCHAR,
                500.00,
                'available',
                event_uuid,
                100 + (seat_counter * 50),
                100,
                '#FFD700'
            WHERE NOT EXISTS (
                SELECT 1 FROM seats 
                WHERE zone = 'VIP' AND row = 'A' AND number = seat_counter::VARCHAR AND event_id = event_uuid
            );
            
            seat_counter := seat_counter + 1;
        END LOOP;
        
        -- Сбрасываем счетчик для Standard зоны
        seat_counter := 1;
        
        -- Создаем места для Standard зоны
        WHILE seat_counter <= 20 LOOP
            INSERT INTO seats (
                zone, row, number, price, status, event_id, x_coordinate, y_coordinate, zone_color
            )
            SELECT 
                'Standard',
                'B',
                seat_counter::VARCHAR,
                250.00,
                'available',
                event_uuid,
                100 + (seat_counter * 40),
                200,
                '#87CEEB'
            WHERE NOT EXISTS (
                SELECT 1 FROM seats 
                WHERE zone = 'Standard' AND row = 'B' AND number = seat_counter::VARCHAR AND event_id = event_uuid
            );
            
            seat_counter := seat_counter + 1;
        END LOOP;
    END IF;
END $$;

-- Обновляем счетчики мест в событии
UPDATE events 
SET 
    total_seats = (
        SELECT COUNT(*) 
        FROM seats 
        WHERE event_id = events.id
    ),
    available_seats = (
        SELECT COUNT(*) 
        FROM seats 
        WHERE event_id = events.id AND status = 'available'
    )
WHERE title = 'Voievod';

-- Проверочные запросы
SELECT 'События созданы:' as info, COUNT(*) as count FROM events WHERE status = 'active';
SELECT 'Тестовый пользователь создан:' as info, COUNT(*) as count FROM users WHERE email = 'test@example.com';
SELECT 'Таблица order_payments существует:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'order_payments';
SELECT 'Места созданы:' as info, COUNT(*) as count FROM seats WHERE event_id IN (SELECT id FROM events WHERE title = 'Voievod');
SELECT 'Зоны с ценами:' as info, COUNT(*) as count FROM zone_pricing WHERE event_id IN (SELECT id FROM events WHERE title = 'Voievod');

-- Показываем информацию о созданном событии
SELECT 
    e.id,
    e.title,
    e.status,
    e.total_seats,
    e.available_seats,
    e.event_date
FROM events e 
WHERE e.title = 'Voievod';