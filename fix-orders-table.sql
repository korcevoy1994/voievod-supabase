-- Пересоздание таблицы orders с правильной структурой

-- Удаляем существующую таблицу если есть (осторожно!)
DROP TABLE IF EXISTS orders CASCADE;

-- Создаем таблицу orders заново
CREATE TABLE orders (
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

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON orders(qr_code);

-- Включаем RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Пересоздаем связанные таблицы
DROP TABLE IF EXISTS order_seats CASCADE;
DROP TABLE IF EXISTS order_general_access CASCADE;
DROP TABLE IF EXISTS order_payments CASCADE;

-- Таблица мест в заказе
CREATE TABLE order_seats (
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
CREATE TABLE order_general_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица платежей
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50) DEFAULT 'maib',
    provider_payment_id VARCHAR(255),
    provider_data JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для связанных таблиц
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seats_seat_id ON order_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);

-- RLS для связанных таблиц
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Политики для связанных таблиц
CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_payments" ON order_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Триггеры для обновления updated_at
CREATE TRIGGER update_order_payments_updated_at 
    BEFORE UPDATE ON order_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();