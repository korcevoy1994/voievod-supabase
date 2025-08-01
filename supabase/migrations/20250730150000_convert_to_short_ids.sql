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

-- Функция для проверки уникальности короткого ID
CREATE OR REPLACE FUNCTION generate_unique_short_id(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        new_id := generate_short_id();
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE id = $1', table_name) 
        INTO exists_check USING new_id;
        
        IF exists_check = 0 THEN
            RETURN new_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Создание новых таблиц с короткими ID

-- Новая таблица orders
CREATE TABLE orders_new (
    id TEXT PRIMARY KEY DEFAULT generate_unique_short_id('orders_new'),
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
    id TEXT PRIMARY KEY DEFAULT generate_unique_short_id('order_seats_new'),
    order_id TEXT NOT NULL,
    seat_id VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_general_access
CREATE TABLE order_general_access_new (
    id TEXT PRIMARY KEY DEFAULT generate_unique_short_id('order_general_access_new'),
    order_id TEXT NOT NULL,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Новая таблица order_payments
CREATE TABLE order_payments_new (
    id TEXT PRIMARY KEY DEFAULT generate_unique_short_id('order_payments_new'),
    order_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Миграция данных
DO $$
DECLARE
    old_order RECORD;
    new_order_id TEXT;
BEGIN
    -- Миграция orders с созданием маппинга
    FOR old_order IN SELECT * FROM orders ORDER BY created_at LOOP
        new_order_id := generate_unique_short_id('orders_new');
        
        INSERT INTO orders_new (
            id, user_id, customer_email, customer_first_name, customer_last_name,
            customer_phone, total_price, total_tickets, payment_method, status,
            pdf_generated, pdf_url, qr_code, event_id, created_at, updated_at
        ) VALUES (
            new_order_id, old_order.user_id, old_order.customer_email, 
            old_order.customer_first_name, old_order.customer_last_name,
            old_order.customer_phone, old_order.total_price, old_order.total_tickets, 
            old_order.payment_method, old_order.status, old_order.pdf_generated, 
            old_order.pdf_url, old_order.qr_code, old_order.event_id, 
            old_order.created_at, old_order.updated_at
        );
        
        -- Миграция связанных order_seats
        INSERT INTO order_seats_new (id, order_id, seat_id, price, created_at)
        SELECT 
            generate_unique_short_id('order_seats_new'),
            new_order_id,
            seat_id,
            price,
            created_at
        FROM order_seats 
        WHERE order_id = old_order.id;
        
        -- Миграция связанных order_general_access
        INSERT INTO order_general_access_new (id, order_id, ticket_name, quantity, price, event_id, created_at)
        SELECT 
            generate_unique_short_id('order_general_access_new'),
            new_order_id,
            ticket_name,
            quantity,
            price,
            event_id,
            created_at
        FROM order_general_access 
        WHERE order_id = old_order.id;
        
        -- Миграция связанных order_payments
        INSERT INTO order_payments_new (id, order_id, amount, payment_method, payment_provider, payment_reference, status, created_at, updated_at)
        SELECT 
            generate_unique_short_id('order_payments_new'),
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

-- Обновление функций для использования коротких ID
CREATE OR REPLACE FUNCTION create_order_with_tickets(
    p_user_id VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_customer_first_name VARCHAR(255),
    p_customer_last_name VARCHAR(255),
    p_customer_phone VARCHAR(50),
    p_total_price DECIMAL(10,2),
    p_total_tickets INTEGER,
    p_payment_method VARCHAR(50),
    p_event_id TEXT,
    p_seats JSONB DEFAULT NULL,
    p_general_access JSONB DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_order_id TEXT;
    seat_item JSONB;
    ga_item JSONB;
BEGIN
    -- Генерируем уникальный короткий ID для заказа
    v_order_id := generate_unique_short_id('orders');
    
    -- Создаем заказ
    INSERT INTO orders (
        id, user_id, customer_email, customer_first_name, customer_last_name,
        customer_phone, total_price, total_tickets, payment_method, event_id
    ) VALUES (
        v_order_id, p_user_id, p_customer_email, p_customer_first_name, p_customer_last_name,
        p_customer_phone, p_total_price, p_total_tickets, p_payment_method, p_event_id
    );
    
    -- Добавляем места, если есть
    IF p_seats IS NOT NULL THEN
        FOR seat_item IN SELECT * FROM jsonb_array_elements(p_seats)
        LOOP
            INSERT INTO order_seats (id, order_id, seat_id, price)
            VALUES (
                generate_unique_short_id('order_seats'),
                v_order_id,
                seat_item->>'seat_id',
                (seat_item->>'price')::DECIMAL(10,2)
            );
        END LOOP;
    END IF;
    
    -- Добавляем general access билеты, если есть
    IF p_general_access IS NOT NULL THEN
        FOR ga_item IN SELECT * FROM jsonb_array_elements(p_general_access)
        LOOP
            INSERT INTO order_general_access (id, order_id, ticket_name, quantity, price, event_id)
            VALUES (
                generate_unique_short_id('order_general_access'),
                v_order_id,
                ga_item->>'ticket_name',
                (ga_item->>'quantity')::INTEGER,
                (ga_item->>'price')::DECIMAL(10,2),
                p_event_id
            );
        END LOOP;
    END IF;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;