-- Конвертация UUID в короткие 8-символьные ID

-- Функция для генерации коротких ID
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Создание новых таблиц с короткими ID

-- Новая таблица orders
CREATE TABLE orders_new (
    id TEXT PRIMARY KEY DEFAULT generate_short_id(),
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
    event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_seats
CREATE TABLE order_seats_new (
    id TEXT PRIMARY KEY DEFAULT generate_short_id(),
    order_id TEXT NOT NULL,
    seat_id VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_general_access
CREATE TABLE order_general_access_new (
    id TEXT PRIMARY KEY DEFAULT generate_short_id(),
    order_id TEXT NOT NULL,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_payments
CREATE TABLE order_payments_new (
    id TEXT PRIMARY KEY DEFAULT generate_short_id(),
    order_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция данных с генерацией новых коротких ID
INSERT INTO orders_new (
    id, user_id, customer_email, customer_first_name, customer_last_name,
    customer_phone, total_price, total_tickets, payment_method, status,
    pdf_generated, pdf_url, qr_code, event_id, created_at, updated_at
)
SELECT 
    generate_short_id(), user_id, customer_email, customer_first_name, customer_last_name,
    customer_phone, total_price, total_tickets, payment_method, status,
    pdf_generated, pdf_url, qr_code, event_id, created_at, updated_at
FROM orders;

-- Создание временной таблицы для маппинга старых и новых ID заказов
CREATE TEMPORARY TABLE order_id_mapping AS
SELECT 
    o_old.id as old_id,
    o_new.id as new_id,
    ROW_NUMBER() OVER (ORDER BY o_old.created_at) as rn
FROM orders o_old
CROSS JOIN LATERAL (
    SELECT id FROM orders_new o_new ORDER BY o_new.created_at LIMIT 1 OFFSET (ROW_NUMBER() OVER (ORDER BY o_old.created_at) - 1)
) o_new;

-- Миграция order_seats с использованием маппинга
INSERT INTO order_seats_new (id, order_id, seat_id, price, created_at)
SELECT 
    generate_short_id(),
    m.new_id,
    os.seat_id,
    os.price,
    os.created_at
FROM order_seats os
JOIN order_id_mapping m ON os.order_id = m.old_id;

-- Миграция order_general_access с использованием маппинга
INSERT INTO order_general_access_new (id, order_id, ticket_name, quantity, price, event_id, created_at)
SELECT 
    generate_short_id(),
    m.new_id,
    oga.ticket_name,
    oga.quantity,
    oga.price,
    oga.event_id,
    oga.created_at
FROM order_general_access oga
JOIN order_id_mapping m ON oga.order_id = m.old_id;

-- Миграция order_payments с использованием маппинга
INSERT INTO order_payments_new (id, order_id, amount, payment_method, payment_provider, payment_reference, status, created_at, updated_at)
SELECT 
    generate_short_id(),
    m.new_id,
    op.amount,
    op.payment_method,
    op.payment_provider,
    op.payment_reference,
    op.status,
    op.created_at,
    op.updated_at
FROM order_payments op
JOIN order_id_mapping m ON op.order_id = m.old_id;

-- Удаление старых таблиц и переименование новых
DROP TABLE IF EXISTS order_payments CASCADE;
DROP TABLE IF EXISTS order_general_access CASCADE;
DROP TABLE IF EXISTS order_seats CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

ALTER TABLE orders_new RENAME TO orders;
ALTER TABLE order_seats_new RENAME TO order_seats;
ALTER TABLE order_general_access_new RENAME TO order_general_access;
ALTER TABLE order_payments_new RENAME TO order_payments;

-- Добавление внешних ключей
ALTER TABLE order_seats ADD CONSTRAINT order_seats_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_general_access ADD CONSTRAINT order_general_access_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_payments ADD CONSTRAINT order_payments_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Создание индексов
CREATE INDEX idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX idx_order_general_access_order_id ON order_general_access(order_id);
CREATE INDEX idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);