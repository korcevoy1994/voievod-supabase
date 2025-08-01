-- Создание триггера для автоматического создания билетов при оплате заказа
-- Этот триггер будет вызывать create_tickets_from_order когда статус заказа меняется на 'paid'

-- Функция триггера для создания билетов при оплате заказа
CREATE OR REPLACE FUNCTION auto_create_tickets_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, изменился ли статус на 'paid'
    IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
        -- Проверяем, есть ли уже билеты для этого заказа
        IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE order_id = NEW.id) THEN
            -- Создаем билеты для заказа
            PERFORM create_tickets_from_order(NEW.id);
            RAISE NOTICE 'Билеты автоматически созданы для заказа % при оплате', NEW.short_order_number;
        ELSE
            RAISE NOTICE 'Билеты уже существуют для заказа %', NEW.short_order_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если существует
DROP TRIGGER IF EXISTS trigger_auto_create_tickets_on_payment ON public.orders;

-- Создаем триггер
CREATE TRIGGER trigger_auto_create_tickets_on_payment
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_tickets_on_payment();

-- Проверяем существующие оплаченные заказы без билетов и создаем для них билеты
DO $$
DECLARE
    order_without_tickets record;
    tickets_count integer;
BEGIN
    RAISE NOTICE 'Проверяем существующие оплаченные заказы без билетов...';
    
    -- Находим оплаченные заказы без билетов
    FOR order_without_tickets IN 
        SELECT o.id, o.short_order_number, o.status
        FROM public.orders o
        LEFT JOIN public.tickets t ON o.id = t.order_id
        WHERE t.id IS NULL
        AND o.status = 'paid'
        ORDER BY o.created_at DESC
    LOOP
        RAISE NOTICE 'Создаем билеты для заказа % (ID: %)', order_without_tickets.short_order_number, order_without_tickets.id;
        
        BEGIN
            -- Создаем билеты для заказа
            PERFORM create_tickets_from_order(order_without_tickets.id);
            
            -- Проверяем сколько билетов создано
            SELECT COUNT(*) INTO tickets_count 
            FROM public.tickets 
            WHERE order_id = order_without_tickets.id;
            
            RAISE NOTICE 'Создано % билетов для заказа %', tickets_count, order_without_tickets.short_order_number;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Ошибка создания билетов для заказа %: %', order_without_tickets.short_order_number, SQLERRM;
        END;
    END LOOP;
END $$;

-- Финальная проверка
DO $$
DECLARE
    total_paid_orders integer;
    orders_with_tickets integer;
    orders_without_tickets integer;
BEGIN
    SELECT COUNT(*) INTO total_paid_orders 
    FROM public.orders 
    WHERE status = 'paid';
    
    SELECT COUNT(DISTINCT t.order_id) INTO orders_with_tickets 
    FROM public.tickets t
    JOIN public.orders o ON t.order_id = o.id
    WHERE o.status = 'paid';
    
    orders_without_tickets := total_paid_orders - orders_with_tickets;
    
    RAISE NOTICE '=== СТАТИСТИКА БИЛЕТОВ ===';
    RAISE NOTICE 'Всего оплаченных заказов: %', total_paid_orders;
    RAISE NOTICE 'Заказов с билетами: %', orders_with_tickets;
    RAISE NOTICE 'Заказов без билетов: %', orders_without_tickets;
    
    IF orders_without_tickets = 0 THEN
        RAISE NOTICE 'Отлично! Все оплаченные заказы имеют билеты.';
    ELSE
        RAISE NOTICE 'Внимание! % заказов не имеют билетов.', orders_without_tickets;
    END IF;
END $$;

RAISE NOTICE 'Триггер для автоматического создания билетов при оплате заказа создан успешно!';
RAISE NOTICE 'Теперь при изменении статуса заказа на "paid" автоматически будут создаваться билеты в таблице tickets.';