-- Исправление проблем с QR кодом и event_id в заказах
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Проверяем и создаем функцию для генерации QR кода заказа
CREATE OR REPLACE FUNCTION generate_order_qr_code(p_order_id UUID)
RETURNS TEXT AS $$
DECLARE
    qr_data TEXT;
BEGIN
    -- Создаем уникальный QR код на основе ID заказа и временной метки
    qr_data := 'ORDER:' || p_order_id::TEXT || ':' || EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Обновляем заказ с QR кодом
    UPDATE public.orders 
    SET qr_code = qr_data, updated_at = NOW()
    WHERE id = p_order_id;
    
    RAISE NOTICE 'QR код создан для заказа %: %', p_order_id, qr_data;
    
    RETURN qr_data;
END;
$$ LANGUAGE plpgsql;

-- 2. Проверяем и обновляем заказы без event_id
DO $$
DECLARE
    active_event_id uuid;
    orders_updated integer := 0;
BEGIN
    -- Получаем ID активного события
    SELECT id INTO active_event_id 
    FROM public.events 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF active_event_id IS NULL THEN
        RAISE NOTICE 'Активное событие не найдено. Создаем тестовое событие...';
        
        -- Создаем тестовое событие если его нет
        INSERT INTO public.events (id, title, description, date, venue, status, created_at, updated_at)
        VALUES (
            uuid_generate_v4(),
            'VOIEVOD Live Concert',
            'Концерт группы VOIEVOD',
            NOW() + INTERVAL '30 days',
            'Arena Chisinau',
            'active',
            NOW(),
            NOW()
        )
        RETURNING id INTO active_event_id;
        
        RAISE NOTICE 'Создано тестовое событие с ID: %', active_event_id;
    ELSE
        RAISE NOTICE 'Найдено активное событие с ID: %', active_event_id;
    END IF;
    
    -- Обновляем заказы без event_id
    UPDATE public.orders 
    SET event_id = active_event_id, updated_at = NOW()
    WHERE event_id IS NULL;
    
    GET DIAGNOSTICS orders_updated = ROW_COUNT;
    
    RAISE NOTICE 'Обновлено % заказов с event_id', orders_updated;
END $$;

-- 3. Генерируем QR коды для заказов без них
DO $$
DECLARE
    order_record record;
    qr_generated integer := 0;
BEGIN
    -- Находим заказы без QR кода
    FOR order_record IN 
        SELECT id, short_order_number
        FROM public.orders 
        WHERE qr_code IS NULL OR qr_code = ''
        ORDER BY created_at DESC
        LIMIT 50  -- Ограничиваем для безопасности
    LOOP
        -- Генерируем QR код для каждого заказа
        BEGIN
            PERFORM generate_order_qr_code(order_record.id);
            qr_generated := qr_generated + 1;
            
            RAISE NOTICE 'QR код создан для заказа % (ID: %)', order_record.short_order_number, order_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Ошибка создания QR кода для заказа %: %', order_record.short_order_number, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Всего создано QR кодов: %', qr_generated;
END $$;

-- 4. Создаем триггер для автоматической генерации QR кода при создании заказа
CREATE OR REPLACE FUNCTION auto_generate_order_qr()
RETURNS TRIGGER AS $$
BEGIN
    -- Генерируем QR код сразу после создания заказа
    IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
        NEW.qr_code := 'ORDER:' || NEW.id::TEXT || ':' || EXTRACT(EPOCH FROM NOW())::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS trigger_auto_generate_order_qr ON public.orders;

-- Создаем новый триггер
CREATE TRIGGER trigger_auto_generate_order_qr
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_order_qr();

-- 5. Создаем функцию для генерации PDF URL (заглушка)
CREATE OR REPLACE FUNCTION generate_order_pdf_url(p_order_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Возвращаем URL для генерации PDF
    RETURN '/api/tickets/pdf?orderId=' || p_order_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Обновляем заказы с PDF URL
DO $$
DECLARE
    order_record record;
    pdf_updated integer := 0;
BEGIN
    -- Находим заказы без PDF URL
    FOR order_record IN 
        SELECT id, short_order_number
        FROM public.orders 
        WHERE pdf_url IS NULL OR pdf_url = ''
        ORDER BY created_at DESC
        LIMIT 50
    LOOP
        -- Обновляем PDF URL
        UPDATE public.orders 
        SET pdf_url = generate_order_pdf_url(order_record.id), updated_at = NOW()
        WHERE id = order_record.id;
        
        pdf_updated := pdf_updated + 1;
        
        RAISE NOTICE 'PDF URL создан для заказа % (ID: %)', order_record.short_order_number, order_record.id;
    END LOOP;
    
    RAISE NOTICE 'Всего обновлено PDF URL: %', pdf_updated;
END $$;

-- 7. Финальная проверка и статистика
DO $$
DECLARE
    total_orders integer;
    orders_with_qr integer;
    orders_with_event integer;
    orders_with_pdf integer;
BEGIN
    SELECT COUNT(*) INTO total_orders FROM public.orders;
    
    SELECT COUNT(*) INTO orders_with_qr 
    FROM public.orders 
    WHERE qr_code IS NOT NULL AND qr_code != '';
    
    SELECT COUNT(*) INTO orders_with_event 
    FROM public.orders 
    WHERE event_id IS NOT NULL;
    
    SELECT COUNT(*) INTO orders_with_pdf 
    FROM public.orders 
    WHERE pdf_url IS NOT NULL AND pdf_url != '';
    
    RAISE NOTICE '=== СТАТИСТИКА ЗАКАЗОВ ===';
    RAISE NOTICE 'Всего заказов: %', total_orders;
    RAISE NOTICE 'Заказов с QR кодом: %', orders_with_qr;
    RAISE NOTICE 'Заказов с event_id: %', orders_with_event;
    RAISE NOTICE 'Заказов с PDF URL: %', orders_with_pdf;
    
    IF orders_with_qr = total_orders AND orders_with_event = total_orders THEN
        RAISE NOTICE 'Отлично! Все заказы имеют необходимые данные.';
    ELSE
        RAISE NOTICE 'Внимание! Некоторые заказы требуют дополнительной обработки.';
    END IF;
END $$;

-- 8. Показываем последние заказы для проверки
DO $$
DECLARE
    order_info record;
BEGIN
    RAISE NOTICE '=== ПОСЛЕДНИЕ 5 ЗАКАЗОВ ===';
    
    FOR order_info IN 
        SELECT 
            short_order_number,
            CASE WHEN qr_code IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_qr,
            CASE WHEN event_id IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_event,
            CASE WHEN pdf_url IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_pdf,
            status
        FROM public.orders 
        ORDER BY created_at DESC 
        LIMIT 5
    LOOP
        RAISE NOTICE 'Заказ %: QR=%, Event=%, PDF=%, Status=%', 
            order_info.short_order_number, 
            order_info.has_qr, 
            order_info.has_event, 
            order_info.has_pdf,
            order_info.status;
    END LOOP;
END $$;