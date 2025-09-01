-- Откат к использованию UUID вместо коротких ID

-- Создание новых таблиц с UUID

-- Новая таблица orders с UUID
CREATE TABLE orders_uuid (
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
    event_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_seats с UUID
CREATE TABLE order_seats_uuid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    seat_id VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_general_access с UUID
CREATE TABLE order_general_access_uuid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    event_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_payments с UUID
CREATE TABLE order_payments_uuid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция данных из коротких ID в UUID
DO $$
DECLARE
    old_order RECORD;
    new_order_id UUID;
    event_uuid UUID;
BEGIN
    -- Получаем UUID активного события
    SELECT id INTO event_uuid FROM events WHERE status = 'active' LIMIT 1;
    
    -- Миграция orders с созданием новых UUID
    FOR old_order IN SELECT * FROM orders ORDER BY created_at LOOP
        new_order_id := uuid_generate_v4();
        
        INSERT INTO orders_uuid (
            id, user_id, customer_email, customer_first_name, customer_last_name,
            customer_phone, total_price, total_tickets, payment_method, status,
            pdf_generated, pdf_url, qr_code, event_id, created_at, updated_at
        ) VALUES (
            new_order_id, old_order.user_id, old_order.customer_email, 
            old_order.customer_first_name, old_order.customer_last_name,
            old_order.customer_phone, old_order.total_price, old_order.total_tickets, 
            old_order.payment_method, old_order.status, old_order.pdf_generated, 
            old_order.pdf_url, old_order.qr_code, event_uuid, 
            old_order.created_at, old_order.updated_at
        );
        
        -- Миграция связанных order_seats
        INSERT INTO order_seats_uuid (id, order_id, seat_id, price, created_at)
        SELECT 
            uuid_generate_v4(),
            new_order_id,
            seat_id,
            price,
            created_at
        FROM order_seats 
        WHERE order_id = old_order.id;
        
        -- Миграция связанных order_general_access
        INSERT INTO order_general_access_uuid (id, order_id, ticket_name, quantity, price, event_id, created_at)
        SELECT 
            uuid_generate_v4(),
            new_order_id,
            ticket_name,
            quantity,
            price,
            event_uuid,
            created_at
        FROM order_general_access 
        WHERE order_id = old_order.id;
        
        -- Миграция связанных order_payments
        INSERT INTO order_payments_uuid (id, order_id, amount, payment_method, payment_provider, payment_reference, status, created_at, updated_at)
        SELECT 
            uuid_generate_v4(),
            new_order_id,
            amount,
            payment_method,
            payment_provider,
            payment_reference,
            status,
            created_at,
            updated_at
        FROM order_payments 
        WHERE order_id = old_order.id;
    END LOOP;
END $$;

-- Удаление старых таблиц и переименование новых
DROP TABLE IF EXISTS order_payments CASCADE;
DROP TABLE IF EXISTS order_general_access CASCADE;
DROP TABLE IF EXISTS order_seats CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

ALTER TABLE orders_uuid RENAME TO orders;
ALTER TABLE order_seats_uuid RENAME TO order_seats;
ALTER TABLE order_general_access_uuid RENAME TO order_general_access;
ALTER TABLE order_payments_uuid RENAME TO order_payments;

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
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Включение RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Создание политик RLS
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_payments" ON order_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Удаление функций для коротких ID
DROP FUNCTION IF EXISTS generate_short_id();
DROP FUNCTION IF EXISTS generate_unique_short_id(TEXT);
DROP FUNCTION IF EXISTS create_order_with_tickets(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DECIMAL, INTEGER, VARCHAR, TEXT, JSONB, JSONB);