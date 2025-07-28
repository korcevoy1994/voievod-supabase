-- Минимальная схема для работы приложения без системы бронирований
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

-- Таблица заказов (основная система для билетов)
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

-- Индексы
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

-- RLS политики (упрощенные)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;

-- Политики для публичного чтения
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (true);

CREATE POLICY "Seats are viewable by everyone" ON seats
    FOR SELECT USING (true);

CREATE POLICY "Zone colors are viewable by everyone" ON zone_colors
    FOR SELECT USING (true);

CREATE POLICY "Zone pricing is viewable by everyone" ON zone_pricing
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

-- Комментарии
COMMENT ON TABLE users IS 'Пользователи системы (включая временных)';
COMMENT ON TABLE events IS 'События/концерты';
COMMENT ON TABLE seats IS 'Места в зале для каждого события';
COMMENT ON TABLE orders IS 'Заказы билетов (основная система)';
COMMENT ON TABLE order_seats IS 'Места в заказах';
COMMENT ON TABLE order_general_access IS 'General access билеты в заказах';