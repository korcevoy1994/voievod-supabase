-- Исправление функции generate_unique_short_id для работы с переименованными таблицами

-- Обновляем функцию, чтобы она корректно работала с текущими именами таблиц
CREATE OR REPLACE FUNCTION generate_unique_short_id(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    exists_check INTEGER;
    actual_table_name TEXT;
BEGIN
    -- Маппинг старых имен таблиц на новые
    CASE table_name
        WHEN 'orders_new' THEN actual_table_name := 'orders';
        WHEN 'order_seats_new' THEN actual_table_name := 'order_seats';
        WHEN 'order_general_access_new' THEN actual_table_name := 'order_general_access';
        WHEN 'order_payments_new' THEN actual_table_name := 'order_payments';
        WHEN 'seats_new' THEN actual_table_name := 'seats';
        ELSE actual_table_name := table_name;
    END CASE;
    
    LOOP
        new_id := generate_short_id();
        
        -- Проверяем существование таблицы перед выполнением запроса
        IF EXISTS (SELECT 1 FROM information_schema.tables t
                  WHERE t.table_schema = 'public' AND t.table_name = actual_table_name) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE id = $1', actual_table_name) 
            INTO exists_check USING new_id;
            
            IF exists_check = 0 THEN
                RETURN new_id;
            END IF;
        ELSE
            -- Если таблица не существует, просто возвращаем новый ID
            RETURN new_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Также создаем функцию generate_short_id если она не существует
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

-- Сообщение об успешном обновлении
DO $$
BEGIN
    RAISE NOTICE 'Функция generate_unique_short_id успешно обновлена!';
END $$;