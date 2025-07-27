-- Fix for PostgreSQL function parameter defaults error
-- This script should be run in Supabase SQL Editor

-- Drop existing function first to avoid parameter defaults conflict
DROP FUNCTION IF EXISTS calculate_seat_price(uuid,character varying,character varying);

-- Now recreate the function
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

-- Also ensure the new tables and functions for PDF tickets are created
-- (Only create if they don't exist)

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
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);

-- RLS политики для новых таблиц
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;

-- Политики для сервисной роли (полный доступ)
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to order_seats" ON order_seats;
CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to order_general_access" ON order_general_access;
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
        'Event Title'::TEXT, -- Здесь можно добавить JOIN с events если нужно
        o.total_tickets,
        o.status,
        (o.status = 'paid' AND o.qr_code = p_qr_code) as is_valid
    FROM orders o
    WHERE o.qr_code = p_qr_code;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at в orders
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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