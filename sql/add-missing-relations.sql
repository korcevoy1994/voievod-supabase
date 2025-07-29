-- Добавление недостающих связей между таблицами

-- 1. Добавляем event_id в таблицу orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 2. Создаем индекс для event_id в orders
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);

-- 3. Обновляем существующие записи orders, устанавливая event_id
-- (предполагаем, что у нас одно событие)
UPDATE orders 
SET event_id = (SELECT id FROM events LIMIT 1)
WHERE event_id IS NULL;

-- 4. Создаем таблицу bookings, если она отсутствует
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  customer_info JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Создаем связующую таблицу booking_seats, если она отсутствует
CREATE TABLE IF NOT EXISTS booking_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, seat_id)
);

-- 6. Создаем таблицу payments, если она отсутствует
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) DEFAULT 'stripe',
  provider_payment_id VARCHAR(255),
  provider_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Обновляем order_seats для использования UUID вместо VARCHAR для seat_id
-- Сначала проверим, есть ли данные в order_seats
DO $$
BEGIN
    -- Проверяем, есть ли колонка seat_id как VARCHAR
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_seats' 
        AND column_name = 'seat_id' 
        AND data_type = 'character varying'
    ) THEN
        -- Если есть данные, нужно их сохранить
        -- Добавляем новую колонку seat_uuid
        ALTER TABLE order_seats ADD COLUMN IF NOT EXISTS seat_uuid UUID REFERENCES seats(id) ON DELETE CASCADE;
        
        -- Обновляем seat_uuid на основе существующих данных seat_id
        -- Это требует сопоставления по zone, row, number
        UPDATE order_seats 
        SET seat_uuid = s.id
        FROM seats s
        WHERE s.zone = order_seats.zone 
        AND s.row = order_seats.row 
        AND s.number = order_seats.number;
        
        -- Удаляем старую колонку seat_id
        ALTER TABLE order_seats DROP COLUMN IF EXISTS seat_id;
        
        -- Переименовываем seat_uuid в seat_id
        ALTER TABLE order_seats RENAME COLUMN seat_uuid TO seat_id;
    END IF;
END $$;

-- 8. Создаем недостающие индексы
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_seats_booking_id ON booking_seats(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seats_seat_id ON booking_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 9. Добавляем триггеры для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Комментарии к таблицам
COMMENT ON TABLE bookings IS 'Бронирования билетов';
COMMENT ON TABLE booking_seats IS 'Связь между бронированиями и местами';
COMMENT ON TABLE payments IS 'Платежи за бронирования';
COMMENT ON COLUMN orders.event_id IS 'Связь с событием';

SELECT 'Связи между таблицами успешно добавлены!' as result;