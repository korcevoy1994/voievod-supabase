-- Упрощенная схема базы данных для одного мероприятия
-- Без таблицы events - все места для единственного события

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Удаляем существующие функции если есть
DROP FUNCTION IF EXISTS create_temporary_user(uuid,character varying,character varying,character varying);
DROP FUNCTION IF EXISTS generate_order_qr_code(uuid);
DROP FUNCTION IF EXISTS verify_order_qr_code(text);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Удаляем существующие таблицы если есть
-- DROP TABLE IF EXISTS order_general_access CASCADE;
-- DROP TABLE IF EXISTS order_seats CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS seats CASCADE;
-- DROP TABLE IF EXISTS zone_pricing CASCADE;
-- DROP TABLE IF EXISTS zone_colors CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

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

-- Таблица ценовых политик для зон (без привязки к событию)
CREATE TABLE IF NOT EXISTS zone_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone VARCHAR(10) NOT NULL UNIQUE,
  base_price DECIMAL(10,2) NOT NULL,
  row_multipliers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица цветов зон
CREATE TABLE IF NOT EXISTS zone_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone VARCHAR(10) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,
  name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица мест (без event_id)
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone VARCHAR(10) NOT NULL,
  row VARCHAR(10) NOT NULL,
  number VARCHAR(10) NOT NULL,
  price DECIMAL(10,2),
  custom_price BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'pending_payment', 'sold', 'blocked')),
  reserved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  x_coordinate DECIMAL(10,2),
  y_coordinate DECIMAL(10,2),
  zone_color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone, row, number)
);

-- Таблица заказов (без event_id)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
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
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица мест в заказе
CREATE TABLE IF NOT EXISTS order_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
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

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
CREATE INDEX IF NOT EXISTS idx_seats_zone ON seats(zone);
CREATE INDEX IF NOT EXISTS idx_seats_reserved_by ON seats(reserved_by);
CREATE INDEX IF NOT EXISTS idx_seats_expires_at ON seats(expires_at);
CREATE INDEX IF NOT EXISTS idx_zone_colors_zone ON zone_colors(zone);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seats_seat_id ON order_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);
CREATE INDEX IF NOT EXISTS idx_users_is_temporary ON users(is_temporary);
CREATE INDEX IF NOT EXISTS idx_users_temp_expires_at ON users(temp_expires_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_seats_updated_at ON seats;
DROP TRIGGER IF EXISTS update_zone_colors_updated_at ON zone_colors;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_zone_pricing_updated_at ON zone_pricing;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_colors_updated_at BEFORE UPDATE ON zone_colors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_pricing_updated_at BEFORE UPDATE ON zone_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Функция для генерации QR кода заказа
CREATE OR REPLACE FUNCTION generate_order_qr_code(p_order_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORDER_' || p_order_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки QR кода заказа
CREATE OR REPLACE FUNCTION verify_order_qr_code(p_qr_code TEXT)
RETURNS TABLE(
  order_id UUID,
  customer_name TEXT,
  total_tickets INTEGER,
  status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.customer_first_name || ' ' || o.customer_last_name,
    o.total_tickets,
    o.status
  FROM orders o
  WHERE o.qr_code = p_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения цены места
CREATE OR REPLACE FUNCTION get_seat_price(p_zone VARCHAR(10), p_row VARCHAR(10))
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_row_multipliers JSONB;
  v_multiplier DECIMAL(10,2) := 1.0;
BEGIN
  -- Получаем базовую цену и множители для зоны
  SELECT base_price, row_multipliers 
  INTO v_base_price, v_row_multipliers
  FROM zone_pricing 
  WHERE zone = p_zone;
  
  -- Если зона не найдена, возвращаем 0
  IF v_base_price IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Получаем множитель для ряда
  IF v_row_multipliers ? p_row THEN
    v_multiplier := (v_row_multipliers ->> p_row)::DECIMAL(10,2);
  END IF;
  
  RETURN v_base_price * v_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического расчета цены места
CREATE OR REPLACE FUNCTION calculate_seat_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Если цена не задана вручную, рассчитываем автоматически
  IF NEW.custom_price = FALSE OR NEW.price IS NULL THEN
    NEW.price := get_seat_price(NEW.zone, NEW.row);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_seat_price_trigger ON seats;
CREATE TRIGGER calculate_seat_price_trigger
  BEFORE INSERT OR UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION calculate_seat_price();

-- RLS политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Seats are viewable by everyone" ON seats;
DROP POLICY IF EXISTS "Zone colors are viewable by everyone" ON zone_colors;
DROP POLICY IF EXISTS "Zone pricing is viewable by everyone" ON zone_pricing;
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to seats" ON seats;
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access to order_seats" ON order_seats;
DROP POLICY IF EXISTS "Service role has full access to order_general_access" ON order_general_access;
DROP POLICY IF EXISTS "Service role has full access to zone_colors" ON zone_colors;
DROP POLICY IF EXISTS "Service role has full access to zone_pricing" ON zone_pricing;

-- Политики для публичного чтения
CREATE POLICY "Seats are viewable by everyone" ON seats
    FOR SELECT USING (true);

CREATE POLICY "Zone colors are viewable by everyone" ON zone_colors
    FOR SELECT USING (true);

CREATE POLICY "Zone pricing is viewable by everyone" ON zone_pricing
    FOR SELECT USING (true);

-- Политики для сервисной роли (полный доступ)
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to seats" ON seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to zone_colors" ON zone_colors
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to zone_pricing" ON zone_pricing
    FOR ALL USING (auth.role() = 'service_role');

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи системы (включая временных)';
COMMENT ON TABLE seats IS 'Места в зале';
COMMENT ON TABLE orders IS 'Заказы билетов';
COMMENT ON TABLE order_seats IS 'Места в заказах';
COMMENT ON TABLE order_general_access IS 'General access билеты в заказах';
COMMENT ON TABLE zone_colors IS 'Цвета зон для визуализации';
COMMENT ON TABLE zone_pricing IS 'Ценовые политики для зон';

-- Тестовые данные

-- Создаем цвета зон
INSERT INTO zone_colors (zone, color, name) VALUES
('201', '#FF6B6B', 'Красная зона'),
('202', '#4ECDC4', 'Бирюзовая зона'),
('203', '#45B7D1', 'Синяя зона'),
('204', '#96CEB4', 'Зеленая зона'),
('205', '#FFEAA7', 'Желтая зона'),
('206', '#DDA0DD', 'Фиолетовая зона'),
('207', '#98D8C8', 'Мятная зона'),
('208', '#F7DC6F', 'Золотая зона'),
('209', '#BB8FCE', 'Лавандовая зона'),
('210', '#85C1E9', 'Голубая зона'),
('211', '#F8C471', 'Оранжевая зона'),
('212', '#82E0AA', 'Светло-зеленая зона'),
('213', '#F1948A', 'Розовая зона')
ON CONFLICT (zone) DO UPDATE SET
  color = EXCLUDED.color,
  name = EXCLUDED.name;

-- Создаем ценовые политики для зон
INSERT INTO zone_pricing (zone, base_price, row_multipliers) VALUES
('201', 150.00, '{"K": 1.5, "J": 1.4, "I": 1.3, "H": 1.2, "G": 1.1, "F": 1.0, "E": 0.9, "D": 0.8, "C": 0.7, "B": 0.6, "A": 0.5}'),
('202', 120.00, '{"K": 1.4, "J": 1.3, "I": 1.2, "H": 1.1, "G": 1.0, "F": 0.9, "E": 0.8, "D": 0.7, "C": 0.6, "B": 0.5, "A": 0.4}'),
('203', 100.00, '{"K": 1.3, "J": 1.2, "I": 1.1, "H": 1.0, "G": 0.9, "F": 0.8, "E": 0.7, "D": 0.6, "C": 0.5, "B": 0.4, "A": 0.3}'),
('204', 80.00, '{"K": 1.2, "J": 1.1, "I": 1.0, "H": 0.9, "G": 0.8, "F": 0.7, "E": 0.6, "D": 0.5, "C": 0.4, "B": 0.3, "A": 0.2}'),
('205', 60.00, '{"K": 1.1, "J": 1.0, "I": 0.9, "H": 0.8, "G": 0.7, "F": 0.6, "E": 0.5, "D": 0.4, "C": 0.3, "B": 0.2, "A": 0.1}'),
('206', 50.00, '{"K": 1.0, "J": 0.9, "I": 0.8, "H": 0.7, "G": 0.6, "F": 0.5, "E": 0.4, "D": 0.3, "C": 0.2, "B": 0.1, "A": 0.1}'),
('207', 45.00, '{"K": 1.0, "J": 0.8, "I": 0.6, "H": 0.4, "G": 0.2, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('208', 40.00, '{"K": 0.9, "J": 0.7, "I": 0.5, "H": 0.3, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('209', 35.00, '{"K": 0.8, "J": 0.6, "I": 0.4, "H": 0.2, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('210', 30.00, '{"K": 0.7, "J": 0.5, "I": 0.3, "H": 0.1, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('211', 25.00, '{"K": 0.6, "J": 0.4, "I": 0.2, "H": 0.1, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('212', 20.00, '{"K": 0.5, "J": 0.3, "I": 0.1, "H": 0.1, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}'),
('213', 15.00, '{"K": 0.4, "J": 0.2, "I": 0.1, "H": 0.1, "G": 0.1, "F": 0.1, "E": 0.1, "D": 0.1, "C": 0.1, "B": 0.1, "A": 0.1}')
ON CONFLICT (zone) DO UPDATE SET
  base_price = EXCLUDED.base_price,
  row_multipliers = EXCLUDED.row_multipliers;

-- Создаем несколько тестовых мест для каждой зоны
INSERT INTO seats (zone, row, number, x_coordinate, y_coordinate, zone_color) VALUES
-- Зона 201
('201', 'K', '01', 42, 20, '#FF6B6B'),
('201', 'K', '02', 78, 20, '#FF6B6B'),
('201', 'K', '03', 114, 20, '#FF6B6B'),
('201', 'J', '01', 42, 57, '#FF6B6B'),
('201', 'J', '02', 78, 57, '#FF6B6B'),
('201', 'J', '03', 114, 57, '#FF6B6B'),
-- Зона 202
('202', 'K', '01', 40, 18, '#4ECDC4'),
('202', 'K', '02', 76, 18, '#4ECDC4'),
('202', 'K', '03', 112, 18, '#4ECDC4'),
('202', 'J', '01', 40, 54, '#4ECDC4'),
('202', 'J', '02', 76, 54, '#4ECDC4'),
('202', 'J', '03', 112, 54, '#4ECDC4'),
-- Зона 203
('203', 'K', '01', 300, 100, '#45B7D1'),
('203', 'K', '02', 320, 100, '#45B7D1'),
('203', 'K', '03', 340, 100, '#45B7D1'),
('203', 'J', '01', 300, 120, '#45B7D1'),
('203', 'J', '02', 320, 120, '#45B7D1'),
('203', 'J', '03', 340, 120, '#45B7D1')
ON CONFLICT (zone, row, number) DO UPDATE SET
  x_coordinate = EXCLUDED.x_coordinate,
  y_coordinate = EXCLUDED.y_coordinate,
  zone_color = EXCLUDED.zone_color;

-- Сообщение об успешном завершении
SELECT 'Упрощенная база данных успешно настроена!' as message,
       (SELECT COUNT(*) FROM seats) as seats_count,
       (SELECT COUNT(*) FROM zone_colors) as zone_colors_count,
       (SELECT COUNT(*) FROM zone_pricing) as zone_pricing_count;