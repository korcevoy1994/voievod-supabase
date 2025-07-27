-- Создание схемы базы данных для системы бронирования билетов

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  is_temporary BOOLEAN DEFAULT FALSE,
  temp_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица событий
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue VARCHAR(255) NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  doors_open TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'postponed', 'sold_out')),
  total_seats INTEGER DEFAULT 0,
  available_seats INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица шаблонов зон (для автоматического создания мест)
CREATE TABLE IF NOT EXISTS zone_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone VARCHAR(10) NOT NULL,
  row VARCHAR(10) NOT NULL,
  number VARCHAR(10) NOT NULL,
  x_coordinate DECIMAL(10,2),
  y_coordinate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone, row, number)
);

-- Таблица ценовых политик для зон
CREATE TABLE IF NOT EXISTS zone_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  zone VARCHAR(10) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  row_multipliers JSONB DEFAULT '{}', -- {"1": 1.2, "2": 1.0, "3": 0.8}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, zone)
);

-- Таблица цветов зон
CREATE TABLE IF NOT EXISTS zone_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone VARCHAR(10) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL, -- HEX цвет, например #FF6B6B
  name VARCHAR(50), -- Название цвета для удобства
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица мест
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  zone VARCHAR(10) NOT NULL,
  row VARCHAR(10) NOT NULL,
  number VARCHAR(10) NOT NULL,
  price DECIMAL(10,2), -- NULL означает использовать цену из zone_pricing
  custom_price BOOLEAN DEFAULT FALSE, -- флаг индивидуальной цены
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'pending_payment', 'sold', 'blocked')),
  reserved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- кто зарезервировал место
  expires_at TIMESTAMP WITH TIME ZONE, -- время истечения резервации
  x_coordinate DECIMAL(10,2),
  y_coordinate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, zone, row, number)
);

-- Таблица бронирований
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

-- Связующая таблица между бронированиями и местами
CREATE TABLE IF NOT EXISTS booking_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, seat_id)
);

-- Таблица платежей
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

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_seats_event_id ON seats(event_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
CREATE INDEX IF NOT EXISTS idx_seats_zone ON seats(zone);
CREATE INDEX IF NOT EXISTS idx_seats_reserved_by ON seats(reserved_by);
CREATE INDEX IF NOT EXISTS idx_seats_expires_at ON seats(expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_seats_booking_id ON booking_seats(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seats_seat_id ON booking_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_zone_colors_zone ON zone_colors(zone);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Функция для расчета цены места на основе зоновой политики
CREATE OR REPLACE FUNCTION calculate_seat_price(p_event_id UUID, p_zone VARCHAR, p_row VARCHAR)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  base_price DECIMAL(10,2);
  row_multiplier DECIMAL(10,2) := 1.0;
  multipliers JSONB;
BEGIN
  -- Получаем базовую цену и мультипликаторы для зоны
  SELECT zp.base_price, zp.row_multipliers
  INTO base_price, multipliers
  FROM zone_pricing zp
  WHERE zp.event_id = p_event_id AND zp.zone = p_zone;
  
  -- Если зона не найдена, возвращаем NULL
  IF base_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Получаем мультипликатор для ряда
  IF multipliers IS NOT NULL AND multipliers ? p_row THEN
    row_multiplier := (multipliers ->> p_row)::DECIMAL(10,2);
  END IF;
  
  RETURN base_price * row_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания мест из шаблона зоны
CREATE OR REPLACE FUNCTION create_seats_from_template(p_event_id UUID, p_zone VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  template_record RECORD;
  seat_price DECIMAL(10,2);
  seats_created INTEGER := 0;
BEGIN
  -- Проходим по всем местам в шаблоне зоны
  FOR template_record IN 
    SELECT zone, row, number, x_coordinate, y_coordinate
    FROM zone_templates
    WHERE zone = p_zone
    ORDER BY row, number
  LOOP
    -- Рассчитываем цену для места
    seat_price := calculate_seat_price(p_event_id, template_record.zone, template_record.row);
    
    -- Создаем место
    INSERT INTO seats (event_id, zone, row, number, price, custom_price, x_coordinate, y_coordinate)
    VALUES (
      p_event_id,
      template_record.zone,
      template_record.row,
      template_record.number,
      seat_price,
      FALSE,
      template_record.x_coordinate,
      template_record.y_coordinate
    )
    ON CONFLICT (event_id, zone, row, number) DO NOTHING;
    
    IF FOUND THEN
      seats_created := seats_created + 1;
    END IF;
  END LOOP;
  
  RETURN seats_created;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения актуальной цены места
CREATE OR REPLACE FUNCTION get_seat_price(p_seat_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  seat_record RECORD;
  calculated_price DECIMAL(10,2);
BEGIN
  -- Получаем информацию о месте
  SELECT event_id, zone, row, price, custom_price
  INTO seat_record
  FROM seats
  WHERE id = p_seat_id;
  
  -- Если место не найдено
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Если у места индивидуальная цена, возвращаем её
  IF seat_record.custom_price AND seat_record.price IS NOT NULL THEN
    RETURN seat_record.price;
  END IF;
  
  -- Иначе рассчитываем цену по зоновой политике
  calculated_price := calculate_seat_price(seat_record.event_id, seat_record.zone, seat_record.row);
  
  -- Если расчетная цена найдена, возвращаем её
  IF calculated_price IS NOT NULL THEN
    RETURN calculated_price;
  END IF;
  
  -- Иначе возвращаем сохраненную цену
  RETURN seat_record.price;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_colors_updated_at BEFORE UPDATE ON zone_colors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического обновления счетчиков мест в событии
CREATE OR REPLACE FUNCTION update_event_seat_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET total_seats = total_seats + 1,
            available_seats = CASE WHEN NEW.status = 'available' THEN available_seats + 1 ELSE available_seats END
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Обновляем счетчик доступных мест при изменении статуса
        IF OLD.status != NEW.status THEN
            UPDATE events 
            SET available_seats = (
                SELECT COUNT(*) FROM seats 
                WHERE event_id = NEW.event_id AND status = 'available'
            )
            WHERE id = NEW.event_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET total_seats = total_seats - 1,
            available_seats = CASE WHEN OLD.status = 'available' THEN available_seats - 1 ELSE available_seats END
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Триггер для обновления счетчиков мест
CREATE TRIGGER update_event_seat_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON seats
    FOR EACH ROW EXECUTE FUNCTION update_event_seat_counts();

-- Функция для автоматического истечения бронирований
CREATE OR REPLACE FUNCTION expire_bookings()
RETURNS void AS $$
BEGIN
    -- Находим истекшие бронирования
    UPDATE bookings 
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
    
    -- Освобождаем места для истекших бронирований
    UPDATE seats 
    SET status = 'available'
    WHERE id IN (
        SELECT bs.seat_id 
        FROM booking_seats bs
        JOIN bookings b ON bs.booking_id = b.id
        WHERE b.status = 'expired'
    ) AND status = 'reserved';
END;
$$ language 'plpgsql';

-- Функция для автоматического освобождения просроченных резерваций мест
CREATE OR REPLACE FUNCTION expire_seat_reservations()
RETURNS void AS $$
BEGIN
    -- Освобождаем места с истекшим временем резервации
    UPDATE seats 
    SET status = 'available', 
        reserved_by = NULL, 
        expires_at = NULL
    WHERE status = 'reserved' 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Функция для резервирования места
CREATE OR REPLACE FUNCTION reserve_seat(p_seat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    seat_status VARCHAR(20);
BEGIN
    -- Сначала освобождаем просроченные резервации
    PERFORM expire_seat_reservations();
    
    -- Проверяем текущий статус места
    SELECT status INTO seat_status
    FROM seats
    WHERE id = p_seat_id;
    
    -- Если место недоступно для резервации
    IF seat_status IS NULL OR seat_status != 'available' THEN
        RETURN FALSE;
    END IF;
    
    -- Резервируем место
    UPDATE seats 
    SET status = 'reserved',
        reserved_by = p_user_id,
        expires_at = NOW() + INTERVAL '15 minutes'
    WHERE id = p_seat_id AND status = 'available';
    
    -- Проверяем, что обновление прошло успешно
    RETURN FOUND;
END;
$$ language 'plpgsql';

-- Функция для перевода места в статус ожидания оплаты
CREATE OR REPLACE FUNCTION set_seat_pending_payment(p_seat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE seats 
    SET status = 'pending_payment',
        expires_at = NULL
    WHERE id = p_seat_id 
      AND status = 'reserved' 
      AND reserved_by = p_user_id;
    
    RETURN FOUND;
END;
$$ language 'plpgsql';

-- Функция для подтверждения продажи места
CREATE OR REPLACE FUNCTION confirm_seat_sale(p_seat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE seats 
    SET status = 'sold'
    WHERE id = p_seat_id 
      AND status = 'pending_payment' 
      AND reserved_by = p_user_id;
    
    RETURN FOUND;
END;
$$ language 'plpgsql';

-- Функция для отмены резервации/оплаты
CREATE OR REPLACE FUNCTION cancel_seat_reservation(p_seat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE seats 
    SET status = 'available',
        reserved_by = NULL,
        expires_at = NULL
    WHERE id = p_seat_id 
      AND (status = 'reserved' OR status = 'pending_payment')
      AND reserved_by = p_user_id;
    
    RETURN FOUND;
END;
$$ language 'plpgsql';

-- Функции для транзакций (используются в API)
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
    -- Эта функция используется для совместимости с API
    -- В PostgreSQL транзакции управляются автоматически
    RETURN;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
    -- Эта функция используется для совместимости с API
    RETURN;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
    -- Эта функция используется для совместимости с API
    RETURN;
END;
$$ language 'plpgsql';

-- RLS (Row Level Security) политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Политики для публичного чтения событий и мест
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (true);

CREATE POLICY "Seats are viewable by everyone" ON seats
    FOR SELECT USING (true);

-- Политики для пользователей (могут видеть только свои данные)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Политики для бронирований
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Политики для связи бронирований и мест
CREATE POLICY "Users can view own booking seats" ON booking_seats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_seats.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create booking seats" ON booking_seats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_seats.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Политики для платежей
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = payments.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = payments.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Политики для сервисной роли (полный доступ)
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to events" ON events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to seats" ON seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bookings" ON bookings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to booking_seats" ON booking_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи системы';
COMMENT ON TABLE events IS 'События/концерты';
COMMENT ON TABLE seats IS 'Места в зале для каждого события';
COMMENT ON TABLE bookings IS 'Бронирования билетов';
COMMENT ON TABLE booking_seats IS 'Связь между бронированиями и местами';
COMMENT ON TABLE payments IS 'Платежи за бронирования';

COMMENT ON COLUMN seats.status IS 'Статус места: available, reserved, sold, blocked';
COMMENT ON COLUMN bookings.status IS 'Статус бронирования: pending, confirmed, cancelled, expired';
COMMENT ON COLUMN payments.status IS 'Статус платежа: pending, processing, completed, failed, cancelled, refunded';
COMMENT ON COLUMN bookings.expires_at IS 'Время истечения бронирования (обычно 15 минут)';
COMMENT ON COLUMN seats.x_coordinate IS 'X координата места на схеме зала';
COMMENT ON COLUMN seats.y_coordinate IS 'Y координата места на схеме зала';

-- Индексы для временных пользователей
CREATE INDEX IF NOT EXISTS idx_users_is_temporary ON users(is_temporary);
CREATE INDEX IF NOT EXISTS idx_users_temp_expires_at ON users(temp_expires_at);

-- Функция для очистки временных пользователей
CREATE OR REPLACE FUNCTION cleanup_temporary_users()
RETURNS TABLE(deleted_users_count INTEGER) AS $$
DECLARE
  users_deleted INTEGER := 0;
BEGIN
  -- Удаляем временных пользователей (старше 2 дней), которые:
  -- 1. Помечены как временные
  -- 2. Истек срок их действия
  -- 3. Не связаны с активными бронированиями
  -- 4. Не имеют зарезервированных мест
  DELETE FROM users 
  WHERE is_temporary = TRUE 
    AND temp_expires_at < NOW()
    AND id NOT IN (
      SELECT DISTINCT user_id FROM bookings 
      WHERE user_id IS NOT NULL
    )
    AND id NOT IN (
      SELECT DISTINCT reserved_by FROM seats 
      WHERE reserved_by IS NOT NULL AND status IN ('reserved', 'pending_payment')
    );
  
  GET DIAGNOSTICS users_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT users_deleted;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания временного пользователя
CREATE OR REPLACE FUNCTION create_temporary_user(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_full_name VARCHAR(255) DEFAULT NULL,
  p_phone VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  INSERT INTO users (id, email, full_name, phone, is_temporary, temp_expires_at)
  VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_phone,
    TRUE,
    NOW() + INTERVAL '2 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();
  
  RETURN p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для конвертации временного пользователя в постоянного
CREATE OR REPLACE FUNCTION convert_temp_user_to_permanent(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET is_temporary = FALSE, temp_expires_at = NULL, updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- ID сессии пользователя
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_price DECIMAL(10,2) NOT NULL,
    total_tickets INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    qr_code TEXT, -- QR код для проверки билета
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица мест в заказе
CREATE TABLE IF NOT EXISTS order_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id VARCHAR(255) NOT NULL, -- ID места (например, "201-1-5")
    zone VARCHAR(10) NOT NULL,
    row VARCHAR(10) NOT NULL,
    number VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица general access билетов в заказе
CREATE TABLE IF NOT EXISTS order_general_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для таблиц заказов
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seats_seat_id ON order_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);

-- Триггер для автоматического обновления updated_at в orders
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS политики для таблиц заказов
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;

-- Политики для заказов
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

-- Функция для генерации QR кода заказа
CREATE OR REPLACE FUNCTION generate_order_qr_code(p_order_id UUID)
RETURNS TEXT AS $$
DECLARE
    qr_data TEXT;
BEGIN
    -- Создаем уникальный QR код на основе ID заказа и временной метки
    qr_data := 'ORDER:' || p_order_id::TEXT || ':' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Обновляем заказ с QR кодом
    UPDATE orders 
    SET qr_code = qr_data, updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN qr_data;
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки QR кода
CREATE OR REPLACE FUNCTION verify_qr_code(p_qr_code TEXT)
RETURNS TABLE(
    order_id UUID,
    customer_name TEXT,
    event_title TEXT,
    total_tickets INTEGER,
    status TEXT,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_first_name || ' ' || o.customer_last_name,
        'Event Title', -- Здесь можно добавить JOIN с events если нужно
        o.total_tickets,
        o.status,
        (o.status = 'paid' AND o.qr_code = p_qr_code) as is_valid
    FROM orders o
    WHERE o.qr_code = p_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Комментарии для новых элементов
COMMENT ON TABLE orders IS 'Таблица заказов билетов';
COMMENT ON COLUMN orders.user_id IS 'ID сессии пользователя (UUID или custom format)';
COMMENT ON COLUMN orders.status IS 'Статус заказа: pending, paid, cancelled, refunded';
COMMENT ON COLUMN orders.payment_method IS 'Метод оплаты: card, cash';
COMMENT ON COLUMN orders.pdf_generated IS 'Флаг генерации PDF билета';
COMMENT ON COLUMN orders.pdf_url IS 'URL сгенерированного PDF билета';
COMMENT ON COLUMN orders.qr_code IS 'QR код для проверки билета';

COMMENT ON TABLE order_seats IS 'Места в заказе';
COMMENT ON COLUMN order_seats.seat_id IS 'ID места в формате zone-row-number';

COMMENT ON TABLE order_general_access IS 'General access билеты в заказе';

COMMENT ON COLUMN users.is_temporary IS 'Флаг временного пользователя';
COMMENT ON COLUMN users.temp_expires_at IS 'Время истечения временного пользователя';