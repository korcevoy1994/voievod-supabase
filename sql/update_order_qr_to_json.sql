-- Обновление функций генерации QR кодов заказов с ORDER формата на JSON формат
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Обновляем функцию генерации QR кода заказа на JSON формат
CREATE OR REPLACE FUNCTION generate_order_qr_code(p_order_id UUID)
RETURNS TEXT AS $$
DECLARE
    qr_data TEXT;
    order_number TEXT;
BEGIN
    -- Получаем номер заказа
    SELECT short_order_number INTO order_number
    FROM public.orders 
    WHERE id = p_order_id;
    
    -- Если номер заказа не найден, используем ID
    IF order_number IS NULL THEN
        order_number := 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || (RANDOM() * 999999)::INTEGER;
    END IF;
    
    -- Создаем JSON QR код с указанными полями
    qr_data := json_build_object(
        'ticket_id', p_order_id,
        'ticket_number', order_number,
        'timestamp', EXTRACT(EPOCH FROM NOW()),
        'checksum', MD5(p_order_id::text || order_number || EXTRACT(EPOCH FROM NOW())::text)
    )::text;
    
    -- Обновляем заказ с QR кодом
    UPDATE public.orders 
    SET qr_code = qr_data, updated_at = NOW()
    WHERE id = p_order_id;
    
    RAISE NOTICE 'JSON QR код создан для заказа %: %', p_order_id, qr_data;
    
    RETURN qr_data;
END;
$$ LANGUAGE plpgsql;

-- 2. Обновляем триггер для автоматической генерации JSON QR кода при создании заказа
CREATE OR REPLACE FUNCTION auto_generate_order_qr()
RETURNS TRIGGER AS $$
DECLARE
    order_number TEXT;
BEGIN
    -- Генерируем JSON QR код сразу после создания заказа
    IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
        -- Используем short_order_number если есть, иначе генерируем
        order_number := COALESCE(NEW.short_order_number, 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || (RANDOM() * 999999)::INTEGER);
        
        NEW.qr_code := json_build_object(
            'ticket_id', NEW.id,
            'ticket_number', order_number,
            'timestamp', EXTRACT(EPOCH FROM NOW()),
            'checksum', MD5(NEW.id::text || order_number || EXTRACT(EPOCH FROM NOW())::text)
        )::text;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Пересоздаем триггер
DROP TRIGGER IF EXISTS trigger_auto_generate_order_qr ON public.orders;
CREATE TRIGGER trigger_auto_generate_order_qr
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_order_qr();

-- 4. Обновляем существующие заказы с ORDER форматом на JSON формат
DO $$
DECLARE
    order_record record;
    new_qr_code TEXT;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Начинаем обновление существующих QR кодов с ORDER формата на JSON...';
    
    -- Находим заказы с ORDER форматом QR кода
    FOR order_record IN 
        SELECT id, short_order_number, qr_code
        FROM public.orders 
        WHERE qr_code LIKE 'ORDER:%:%'
        ORDER BY created_at DESC
    LOOP
        -- Создаем новый JSON QR код
        new_qr_code := json_build_object(
            'ticket_id', order_record.id,
            'ticket_number', COALESCE(order_record.short_order_number, 'ORD-' || EXTRACT(YEAR FROM NOW()) || '-' || (RANDOM() * 999999)::INTEGER),
            'timestamp', EXTRACT(EPOCH FROM NOW()),
            'checksum', MD5(order_record.id::text || COALESCE(order_record.short_order_number, 'ORD-DEFAULT') || EXTRACT(EPOCH FROM NOW())::text)
        )::text;
        
        -- Обновляем заказ
        UPDATE public.orders 
        SET qr_code = new_qr_code, updated_at = NOW()
        WHERE id = order_record.id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE 'Обновлен QR код для заказа % (ID: %)', order_record.short_order_number, order_record.id;
    END LOOP;
    
    RAISE NOTICE 'Всего обновлено QR кодов: %', updated_count;
END $$;

-- 5. Финальная проверка
DO $$
DECLARE
    total_orders INTEGER;
    json_qr_orders INTEGER;
    order_qr_orders INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_orders FROM public.orders;
    
    SELECT COUNT(*) INTO json_qr_orders 
    FROM public.orders 
    WHERE qr_code LIKE '{%}' AND qr_code::json ? 'ticket_id';
    
    SELECT COUNT(*) INTO order_qr_orders 
    FROM public.orders 
    WHERE qr_code LIKE 'ORDER:%:%';
    
    RAISE NOTICE '=== СТАТИСТИКА QR КОДОВ ==='; 
    RAISE NOTICE 'Всего заказов: %', total_orders;
    RAISE NOTICE 'Заказов с JSON QR кодом: %', json_qr_orders;
    RAISE NOTICE 'Заказов с ORDER QR кодом: %', order_qr_orders;
    
    IF order_qr_orders = 0 THEN
        RAISE NOTICE 'Отлично! Все QR коды переведены в JSON формат.';
    ELSE
        RAISE NOTICE 'Внимание! Остались заказы с ORDER форматом: %', order_qr_orders;
    END IF;
END $$;

-- 6. Показываем примеры новых QR кодов
DO $$
DECLARE
    order_info record;
BEGIN
    RAISE NOTICE '=== ПРИМЕРЫ НОВЫХ JSON QR КОДОВ ==='; 
    
    FOR order_info IN 
        SELECT 
            short_order_number,
            LEFT(qr_code, 100) || '...' as qr_preview
        FROM public.orders 
        WHERE qr_code LIKE '{%}'
        ORDER BY updated_at DESC 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Заказ %: %', order_info.short_order_number, order_info.qr_preview;
    END LOOP;
END $$;