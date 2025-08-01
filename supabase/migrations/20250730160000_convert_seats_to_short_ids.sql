-- Конвертация мест в короткие ID
-- Создаем функцию для генерации коротких ID для мест
CREATE OR REPLACE FUNCTION generate_short_seat_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    random_index INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        random_index := floor(random() * length(chars))::INTEGER + 1;
        result := result || substr(chars, random_index, 1);
    END LOOP;
    
    -- Проверяем уникальность
    WHILE EXISTS (SELECT 1 FROM seats WHERE id = result) LOOP
        result := '';
        FOR i IN 1..8 LOOP
            random_index := floor(random() * length(chars))::INTEGER + 1;
            result := result || substr(chars, random_index, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Создаем новую таблицу seats с короткими ID
CREATE TABLE seats_new (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    zone TEXT NOT NULL,
    row TEXT NOT NULL,
    number TEXT NOT NULL,
    x_coordinate INTEGER NOT NULL,
    y_coordinate INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    price INTEGER NOT NULL,
    zone_color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Копируем данные из старой таблицы в новую с короткими ID
DO $$
DECLARE
    seat_rec RECORD;
    new_id TEXT;
BEGIN
    FOR seat_rec IN 
        SELECT zone, row, number, x_coordinate, y_coordinate, status, price, zone_color, 
               COALESCE(created_at, NOW()) as created_at, 
               COALESCE(updated_at, NOW()) as updated_at
        FROM seats 
        ORDER BY zone, row, number
    LOOP
        new_id := generate_short_seat_id();
        
        INSERT INTO seats_new (id, event_id, zone, row, number, x_coordinate, y_coordinate, status, price, zone_color, created_at, updated_at)
        VALUES (
            new_id,
            'VOIEVOD1', -- Используем короткий ID события
            seat_rec.zone,
            seat_rec.row,
            seat_rec.number,
            seat_rec.x_coordinate,
            seat_rec.y_coordinate,
            seat_rec.status,
            seat_rec.price,
            seat_rec.zone_color,
            seat_rec.created_at,
            seat_rec.updated_at
        );
    END LOOP;
END $$;

-- Удаляем старую таблицу и переименовываем новую
DROP TABLE IF EXISTS seats;
ALTER TABLE seats_new RENAME TO seats;

-- Создаем индексы
CREATE INDEX idx_seats_event_id ON seats(event_id);
CREATE INDEX idx_seats_zone ON seats(zone);
CREATE INDEX idx_seats_status ON seats(status);
CREATE UNIQUE INDEX idx_seats_position ON seats(event_id, zone, row, number);

-- Обновляем функцию генерации мест для использования коротких ID
CREATE OR REPLACE FUNCTION generate_seats_for_event(p_event_id TEXT)
RETURNS VOID AS $$
DECLARE
    zone_rec RECORD;
    seat_count INTEGER;
    current_seat INTEGER;
    row_letter TEXT;
    seat_number TEXT;
    x_pos INTEGER;
    y_pos INTEGER;
    row_index INTEGER;
    seat_index INTEGER;
BEGIN
    -- Удаляем существующие места для события
    DELETE FROM seats WHERE event_id = p_event_id;
    
    -- Генерируем места для каждой зоны
    FOR zone_rec IN 
        SELECT zone, price, zone_color, seat_count 
        FROM zone_pricing 
        WHERE event_id = p_event_id
    LOOP
        current_seat := 1;
        row_index := 0;
        
        -- Генерируем места для зоны
        WHILE current_seat <= zone_rec.seat_count LOOP
            row_letter := chr(65 + (row_index % 26)); -- A, B, C, ...
            
            -- Генерируем до 20 мест в ряду
            FOR seat_index IN 1..LEAST(20, zone_rec.seat_count - current_seat + 1) LOOP
                seat_number := LPAD(seat_index::TEXT, 2, '0');
                
                -- Вычисляем координаты (примерные)
                x_pos := 40 + (seat_index - 1) * 36;
                y_pos := 20 + row_index * 36;
                
                INSERT INTO seats (
                    id, event_id, zone, row, number, 
                    x_coordinate, y_coordinate, status, price, zone_color
                ) VALUES (
                    generate_short_seat_id(),
                    p_event_id,
                    zone_rec.zone,
                    row_letter,
                    seat_number,
                    x_pos,
                    y_pos,
                    'available',
                    zone_rec.price,
                    zone_rec.zone_color
                );
                
                current_seat := current_seat + 1;
                
                IF current_seat > zone_rec.seat_count THEN
                    EXIT;
                END IF;
            END LOOP;
            
            row_index := row_index + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Удаляем функцию генерации коротких ID для мест (больше не нужна)
DROP FUNCTION IF EXISTS generate_short_seat_id();