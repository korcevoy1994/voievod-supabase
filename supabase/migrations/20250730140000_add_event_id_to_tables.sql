-- Добавляем event_id колонки в таблицы, которые должны быть связаны с событиями

-- Добавляем event_id в order_payments, если колонки нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_payments' AND column_name = 'event_id') THEN
        ALTER TABLE order_payments ADD COLUMN event_id UUID;
        ALTER TABLE order_payments ADD CONSTRAINT fk_order_payments_event 
            FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

-- Добавляем event_id в order_seats, если колонки нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_seats' AND column_name = 'event_id') THEN
        ALTER TABLE order_seats ADD COLUMN event_id UUID;
        ALTER TABLE order_seats ADD CONSTRAINT fk_order_seats_event 
            FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

-- Добавляем event_id в tickets, если колонки нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event 
            FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

-- Обновляем существующие записи, чтобы они ссылались на наше событие
UPDATE order_payments SET event_id = '550e8400-e29b-41d4-a716-446655440000' WHERE event_id IS NULL;
UPDATE order_seats SET event_id = '550e8400-e29b-41d4-a716-446655440000' WHERE event_id IS NULL;
UPDATE tickets SET event_id = '550e8400-e29b-41d4-a716-446655440000' WHERE event_id IS NULL;