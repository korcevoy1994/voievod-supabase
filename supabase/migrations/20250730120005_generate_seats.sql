-- Генерация мест для всех зон

-- Функция для создания мест для события
CREATE OR REPLACE FUNCTION generate_seats_for_event(event_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  zone_record RECORD;
  seat_count INTEGER;
BEGIN
  -- Создаем места для каждой зоны с ценообразованием
  FOR zone_record IN 
    SELECT zone, price FROM zone_pricing WHERE event_id = event_uuid
  LOOP
    -- Определяем количество мест для каждой зоны
    CASE zone_record.zone
      WHEN '201' THEN seat_count := 50;
      WHEN '202' THEN seat_count := 45;
      WHEN '203' THEN seat_count := 40;
      WHEN '204' THEN seat_count := 30;
      WHEN '205' THEN seat_count := 55;
      WHEN '206' THEN seat_count := 60;
      WHEN '207' THEN seat_count := 60;
      WHEN '208' THEN seat_count := 60;
      WHEN '209' THEN seat_count := 55;
      WHEN '210' THEN seat_count := 40;
      WHEN '211' THEN seat_count := 40;
      WHEN '212' THEN seat_count := 45;
      WHEN '213' THEN seat_count := 50;
      ELSE seat_count := 30;
    END CASE;
    
    -- Создаем места для зоны
    FOR i IN 1..seat_count LOOP
      INSERT INTO seats (
        event_id,
        zone,
        row,
        number,
        price,
        status,
        x_coordinate,
        y_coordinate,
        zone_color
      ) VALUES (
        event_uuid,
        zone_record.zone,
        CASE 
          WHEN i <= 10 THEN '1'
          WHEN i <= 20 THEN '2'
          WHEN i <= 30 THEN '3'
          WHEN i <= 40 THEN '4'
          WHEN i <= 50 THEN '5'
          ELSE '6'
        END,
        ((i - 1) % 10 + 1)::text,
        zone_record.price,
        'available',
        (RANDOM() * 800 + 100)::numeric,
        (RANDOM() * 600 + 100)::numeric,
        (SELECT color FROM zone_colors WHERE zone = zone_record.zone)
      );
    END LOOP;
    
    RAISE NOTICE 'Создано % мест для зоны %', seat_count, zone_record.zone;
  END LOOP;
END;
$$;

-- Создаем места для тестового события
SELECT generate_seats_for_event('550e8400-e29b-41d4-a716-446655440000');

-- Обновляем счетчики мест в событии
UPDATE events 
SET 
  total_seats = (SELECT COUNT(*) FROM seats WHERE event_id = '550e8400-e29b-41d4-a716-446655440000'),
  available_seats = (SELECT COUNT(*) FROM seats WHERE event_id = '550e8400-e29b-41d4-a716-446655440000' AND status = 'available')
WHERE id = '550e8400-e29b-41d4-a716-446655440000';