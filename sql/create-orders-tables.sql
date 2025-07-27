-- Создание таблиц для системы заказов и пользователей

-- Таблица для заказов
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL, -- ID сессии пользователя
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_price DECIMAL(10,2) NOT NULL,
    total_tickets INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для мест в заказе
CREATE TABLE IF NOT EXISTS order_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id VARCHAR(255) NOT NULL, -- ID места (например, "201-1-5")
    zone VARCHAR(10) NOT NULL,
    row VARCHAR(10) NOT NULL,
    number VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для general access билетов в заказе
CREATE TABLE IF NOT EXISTS order_general_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seats_seat_id ON order_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблицам
COMMENT ON TABLE orders IS 'Таблица заказов билетов';
COMMENT ON COLUMN orders.user_id IS 'ID сессии пользователя (UUID или custom format)';
COMMENT ON COLUMN orders.status IS 'Статус заказа: pending, paid, cancelled, refunded';
COMMENT ON COLUMN orders.payment_method IS 'Метод оплаты: card, cash';

COMMENT ON TABLE order_seats IS 'Места в заказе';
COMMENT ON COLUMN order_seats.seat_id IS 'ID места в формате zone-row-number';

COMMENT ON TABLE order_general_access IS 'General access билеты в заказе';

-- Пример вставки тестовых данных
/*
INSERT INTO orders (user_id, customer_email, customer_first_name, customer_last_name, customer_phone, total_price, total_tickets, payment_method, status)
VALUES 
('user-1234567890-abc123def', 'test@example.com', 'Иван', 'Иванов', '+373 69 123 456', 1500.00, 3, 'card', 'paid');

INSERT INTO order_seats (order_id, seat_id, zone, row, number, price)
VALUES 
((SELECT id FROM orders WHERE customer_email = 'test@example.com' LIMIT 1), '201-1-5', '201', '1', '5', 500.00),
((SELECT id FROM orders WHERE customer_email = 'test@example.com' LIMIT 1), '201-1-6', '201', '1', '6', 500.00);

INSERT INTO order_general_access (order_id, ticket_name, price, quantity)
VALUES 
((SELECT id FROM orders WHERE customer_email = 'test@example.com' LIMIT 1), 'General Access', 500.00, 1);
*/