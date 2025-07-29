-- Добавление поля для короткого номера заказа

-- Добавляем поле short_order_number в таблицу orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS short_order_number VARCHAR(20) UNIQUE;

-- Создаем индекс для быстрого поиска по короткому номеру
CREATE INDEX IF NOT EXISTS idx_orders_short_order_number ON orders(short_order_number);

-- Создаем последовательность для генерации коротких номеров
CREATE SEQUENCE IF NOT EXISTS short_order_number_seq START 1000;

-- Функция для генерации короткого номера заказа
CREATE OR REPLACE FUNCTION generate_short_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    short_number VARCHAR(20);
    counter INTEGER;
    max_attempts INTEGER := 100;
BEGIN
    -- Пытаемся сгенерировать уникальный короткий номер
    FOR counter IN 1..max_attempts LOOP
        -- Генерируем номер в формате ORD-YYYY-NNNN
        short_number := 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('short_order_number_seq')::TEXT, 4, '0');
        
        -- Проверяем, что такого номера еще нет
        IF NOT EXISTS (SELECT 1 FROM orders WHERE short_order_number = short_number) THEN
            RETURN short_number;
        END IF;
    END LOOP;
    
    -- Если не удалось сгенерировать уникальный номер, возвращаем с timestamp
    RETURN 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Функция-триггер для автоматической генерации короткого номера при создании заказа
CREATE OR REPLACE FUNCTION set_short_order_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Генерируем короткий номер только если он не был задан
    IF NEW.short_order_number IS NULL THEN
        NEW.short_order_number := generate_short_order_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической генерации короткого номера
DROP TRIGGER IF EXISTS trigger_set_short_order_number ON orders;
CREATE TRIGGER trigger_set_short_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_short_order_number();

-- Обновляем существующие заказы, добавляя им короткие номера
UPDATE orders 
SET short_order_number = generate_short_order_number() 
WHERE short_order_number IS NULL;

-- Комментарии
COMMENT ON COLUMN orders.short_order_number IS 'Короткий номер заказа в формате ORD-YYYY-NNNN';
COMMENT ON FUNCTION generate_short_order_number() IS 'Генерирует уникальный короткий номер заказа';
COMMENT ON FUNCTION set_short_order_number() IS 'Триггер-функция для автоматической генерации короткого номера заказа';

-- Сообщение об успешном выполнении
DO $$
BEGIN
  RAISE NOTICE 'Поле short_order_number успешно добавлено в таблицу orders!';
  RAISE NOTICE 'Теперь каждый заказ будет иметь короткий номер в формате ORD-YYYY-NNNN';
END $$;