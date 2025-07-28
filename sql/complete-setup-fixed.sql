-- Полная настройка базы данных для системы бронирования билетов
-- Выполните этот файл в Supabase SQL Editor
-- Исправленная версия с DROP FUNCTION для решения конфликтов

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Удаляем существующие функции если есть
DROP FUNCTION IF EXISTS create_temporary_user(uuid,character varying,character varying,character varying);
DROP FUNCTION IF EXISTS generate_order_qr_code(uuid);
DROP FUNCTION IF EXISTS verify_order_qr_code(text);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Удаляем существующие таблицы если есть (осторожно!)
-- Раскомментируйте следующие строки если нужно полностью пересоздать базу
-- DROP TABLE IF EXISTS order_general_access CASCADE;
-- DROP TABLE IF EXISTS order_seats CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS seats CASCADE;
-- DROP TABLE IF EXISTS zone_pricing CASCADE;
-- DROP TABLE IF EXISTS zone_colors CASCADE;
-- DROP TABLE IF EXISTS zone_templates CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
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

-- Таблица шаблонов зон
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
  row_multipliers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, zone)
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

-- Таблица мест
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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
  UNIQUE(event_id, zone, row, number)
);

-- Таблица заказов
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
    seat_id VARCHAR(255) NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_seats_event_id ON seats(event_id);
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
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_seats_updated_at ON seats;
DROP TRIGGER IF EXISTS update_zone_colors_updated_at ON zone_colors;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_colors_updated_at BEFORE UPDATE ON zone_colors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
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

-- RLS политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_templates ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Seats are viewable by everyone" ON seats;
DROP POLICY IF EXISTS "Zone colors are viewable by everyone" ON zone_colors;
DROP POLICY IF EXISTS "Zone pricing is viewable by everyone" ON zone_pricing;
DROP POLICY IF EXISTS "Zone templates are viewable by everyone" ON zone_templates;
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to events" ON events;
DROP POLICY IF EXISTS "Service role has full access to seats" ON seats;
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access to order_seats" ON order_seats;
DROP POLICY IF EXISTS "Service role has full access to order_general_access" ON order_general_access;
DROP POLICY IF EXISTS "Service role has full access to zone_colors" ON zone_colors;
DROP POLICY IF EXISTS "Service role has full access to zone_pricing" ON zone_pricing;
DROP POLICY IF EXISTS "Service role has full access to zone_templates" ON zone_templates;

-- Политики для публичного чтения
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (true);

CREATE POLICY "Seats are viewable by everyone" ON seats
    FOR SELECT USING (true);

CREATE POLICY "Zone colors are viewable by everyone" ON zone_colors
    FOR SELECT USING (true);

CREATE POLICY "Zone pricing is viewable by everyone" ON zone_pricing
    FOR SELECT USING (true);

CREATE POLICY "Zone templates are viewable by everyone" ON zone_templates
    FOR SELECT USING (true);

-- Политики для сервисной роли (полный доступ)
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to events" ON events
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

CREATE POLICY "Service role has full access to zone_templates" ON zone_templates
    FOR ALL USING (auth.role() = 'service_role');

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи системы (включая временных)';
COMMENT ON TABLE events IS 'События/концерты';
COMMENT ON TABLE seats IS 'Места в зале для каждого события';
COMMENT ON TABLE orders IS 'Заказы билетов (основная система)';
COMMENT ON TABLE order_seats IS 'Места в заказах';
COMMENT ON TABLE order_general_access IS 'General access билеты в заказах';
COMMENT ON TABLE zone_colors IS 'Цвета зон для визуализации';
COMMENT ON TABLE zone_pricing IS 'Ценовые политики для зон';
COMMENT ON TABLE zone_templates IS 'Шаблоны мест для создания схемы зала';

-- Тестовые данные

-- Создаем тестовое событие
INSERT INTO events (id, title, description, venue, event_date, doors_open, status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Концерт в Арене',
  'Большой концерт в главной арене города',
  'Главная Арена',
  '2024-12-31 20:00:00+00',
  '2024-12-31 19:00:00+00',
  'active'
) ON CONFLICT (id) DO NOTHING;

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
INSERT INTO zone_pricing (event_id, zone, base_price, row_multipliers) VALUES
('550e8400-e29b-41d4-a716-446655440000', '201', 150.00, '{"1": 1.5, "2": 1.3, "3": 1.1, "4": 1.0}'),
('550e8400-e29b-41d4-a716-446655440000', '202', 120.00, '{"1": 1.4, "2": 1.2, "3": 1.0, "4": 0.9}'),
('550e8400-e29b-41d4-a716-446655440000', '203', 100.00, '{"1": 1.3, "2": 1.1, "3": 1.0, "4": 0.8}'),
('550e8400-e29b-41d4-a716-446655440000', '204', 80.00, '{"1": 1.2, "2": 1.0, "3": 0.9, "4": 0.7}'),
('550e8400-e29b-41d4-a716-446655440000', '205', 60.00, '{"1": 1.1, "2": 1.0, "3": 0.8, "4": 0.6}'),
('550e8400-e29b-41d4-a716-446655440000', '206', 50.00, '{"1": 1.0, "2": 0.9, "3": 0.7, "4": 0.5}'),
('550e8400-e29b-41d4-a716-446655440000', '207', 45.00, '{"1": 1.0, "2": 0.8, "3": 0.6, "4": 0.4}'),
('550e8400-e29b-41d4-a716-446655440000', '208', 40.00, '{"1": 0.9, "2": 0.7, "3": 0.5, "4": 0.3}'),
('550e8400-e29b-41d4-a716-446655440000', '209', 35.00, '{"1": 0.8, "2": 0.6, "3": 0.4, "4": 0.2}'),
('550e8400-e29b-41d4-a716-446655440000', '210', 30.00, '{"1": 0.7, "2": 0.5, "3": 0.3, "4": 0.1}'),
('550e8400-e29b-41d4-a716-446655440000', '211', 25.00, '{"1": 0.6, "2": 0.4, "3": 0.2, "4": 0.1}'),
('550e8400-e29b-41d4-a716-446655440000', '212', 20.00, '{"1": 0.5, "2": 0.3, "3": 0.1, "4": 0.1}'),
('550e8400-e29b-41d4-a716-446655440000', '213', 15.00, '{"1": 0.4, "2": 0.2, "3": 0.1, "4": 0.1}')
ON CONFLICT (event_id, zone) DO UPDATE SET
  base_price = EXCLUDED.base_price,
  row_multipliers = EXCLUDED.row_multipliers;

-- Создаем несколько тестовых мест для каждой зоны
INSERT INTO seats (event_id, zone, row, number, price, x_coordinate, y_coordinate, zone_color) VALUES
-- Зона 201
('550e8400-e29b-41d4-a716-446655440000', '201', '1', '1', 225.00, 100, 100, '#FF6B6B'),
('550e8400-e29b-41d4-a716-446655440000', '201', '1', '2', 225.00, 120, 100, '#FF6B6B'),
('550e8400-e29b-41d4-a716-446655440000', '201', '1', '3', 225.00, 140, 100, '#FF6B6B'),
('550e8400-e29b-41d4-a716-446655440000', '201', '2', '1', 195.00, 100, 120, '#FF6B6B'),
('550e8400-e29b-41d4-a716-446655440000', '201', '2', '2', 195.00, 120, 120, '#FF6B6B'),
-- Зона 202
('550e8400-e29b-41d4-a716-446655440000', '202', '1', '1', 168.00, 200, 100, '#4ECDC4'),
('550e8400-e29b-41d4-a716-446655440000', '202', '1', '2', 168.00, 220, 100, '#4ECDC4'),
('550e8400-e29b-41d4-a716-446655440000', '202', '2', '1', 144.00, 200, 120, '#4ECDC4'),
('550e8400-e29b-41d4-a716-446655440000', '202', '2', '2', 144.00, 220, 120, '#4ECDC4'),
-- Зона 203
('550e8400-e29b-41d4-a716-446655440000', '203', '1', '1', 130.00, 300, 100, '#45B7D1'),
('550e8400-e29b-41d4-a716-446655440000', '203', '1', '2', 130.00, 320, 100, '#45B7D1'),
('550e8400-e29b-41d4-a716-446655440000', '203', '2', '1', 110.00, 300, 120, '#45B7D1'),
('550e8400-e29b-41d4-a716-446655440000', '203', '2', '2', 110.00, 320, 120, '#45B7D1')
ON CONFLICT (event_id, zone, row, number) DO UPDATE SET
  price = EXCLUDED.price,
  x_coordinate = EXCLUDED.x_coordinate,
  y_coordinate = EXCLUDED.y_coordinate,
  zone_color = EXCLUDED.zone_color;

-- Обновляем счетчики мест в событии
UPDATE events 
SET total_seats = (SELECT COUNT(*) FROM seats WHERE event_id = '550e8400-e29b-41d4-a716-446655440000'),
    available_seats = (SELECT COUNT(*) FROM seats WHERE event_id = '550e8400-e29b-41d4-a716-446655440000' AND status = 'available')
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Сообщение об успешном завершении
SELECT 'База данных успешно настроена!' as message,
       (SELECT COUNT(*) FROM events) as events_count,
       (SELECT COUNT(*) FROM seats) as seats_count,
       (SELECT COUNT(*) FROM zone_colors) as zone_colors_count,
       (SELECT COUNT(*) FROM zone_pricing) as zone_pricing_count;