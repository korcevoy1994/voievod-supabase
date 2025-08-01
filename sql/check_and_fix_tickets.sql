-- Проверка и исправление системы билетов
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Проверяем существование таблицы tickets
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') THEN
        RAISE NOTICE 'Таблица tickets не существует. Создаем...';
        
        CREATE TABLE public.tickets (
            id uuid NOT NULL DEFAULT uuid_generate_v4(),
            order_id uuid NOT NULL,
            event_id uuid NOT NULL,
            
            -- Информация о билете
            ticket_number character varying NOT NULL UNIQUE,
            qr_code text NOT NULL UNIQUE,
            ticket_type character varying NOT NULL DEFAULT 'seat',
            
            -- Информация о месте (для билетов с местами)
            seat_id uuid,
            zone character varying,
            row character varying,
            seat_number character varying,
            
            -- Информация о цене
            price numeric NOT NULL,
            
            -- Статус билета
            status character varying NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
            
            -- Информация о владельце билета
            holder_name character varying NOT NULL,
            holder_email character varying NOT NULL,
            holder_phone character varying,
            
            -- Информация об использовании
            scanned_at timestamp with time zone,
            scanned_by character varying,
            entry_gate character varying,
            
            -- Метаданные
            pdf_generated boolean DEFAULT false,
            pdf_url text,
            email_sent boolean DEFAULT false,
            email_sent_at timestamp with time zone,
            
            -- Временные метки
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            
            -- Ограничения
            CONSTRAINT tickets_pkey PRIMARY KEY (id),
            CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
            CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
            CONSTRAINT tickets_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL
        );
        
        -- Создаем индексы
        CREATE INDEX idx_tickets_order_id ON public.tickets(order_id);
        CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
        CREATE INDEX idx_tickets_qr_code ON public.tickets(qr_code);
        CREATE INDEX idx_tickets_ticket_number ON public.tickets(ticket_number);
        CREATE INDEX idx_tickets_status ON public.tickets(status);
        CREATE INDEX idx_tickets_seat_id ON public.tickets(seat_id);
        CREATE INDEX idx_tickets_holder_email ON public.tickets(holder_email);
        
        RAISE NOTICE 'Таблица tickets создана успешно!';
    ELSE
        RAISE NOTICE 'Таблица tickets уже существует.';
    END IF;
END $$;

-- 2. Создаем функции для генерации данных билета
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer := 0;
BEGIN
  LOOP
    new_number := 'VOEV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD((RANDOM() * 999999)::integer::text, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE ticket_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Не удалось сгенерировать уникальный номер билета';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_qr_code(ticket_id uuid, ticket_number text)
RETURNS text AS $$
BEGIN
  RETURN json_build_object(
    'ticket_id', ticket_id,
    'ticket_number', ticket_number,
    'timestamp', EXTRACT(EPOCH FROM NOW()),
    'checksum', MD5(ticket_id::text || ticket_number || EXTRACT(EPOCH FROM NOW())::text)
  )::text;
END;
$$ LANGUAGE plpgsql;

-- 3. Создаем триггер для автоматической генерации данных билета
CREATE OR REPLACE FUNCTION auto_generate_ticket_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code := generate_qr_code(NEW.id, NEW.ticket_number);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_ticket_data ON public.tickets;
CREATE TRIGGER trigger_auto_generate_ticket_data
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ticket_data();

-- 4. Создаем основную функцию для создания билетов из заказа
CREATE OR REPLACE FUNCTION create_tickets_from_order(order_uuid uuid)
RETURNS void AS $$
DECLARE
  order_record record;
  seat_record record;
  general_record record;
BEGIN
  -- Получаем информацию о заказе
  SELECT * INTO order_record FROM public.orders WHERE id = order_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заказ с ID % не найден', order_uuid;
  END IF;
  
  RAISE NOTICE 'Создаем билеты для заказа: %', order_uuid;
  
  -- Создаем билеты для мест
  FOR seat_record IN 
    SELECT os.*, s.zone, s.row, s.number as seat_number
    FROM public.order_seats os
    JOIN public.seats s ON os.seat_id = s.id
    WHERE os.order_id = order_uuid
  LOOP
    INSERT INTO public.tickets (
      order_id, event_id, ticket_type, seat_id, zone, row, seat_number,
      price, holder_name, holder_email, holder_phone
    ) VALUES (
      order_uuid,
      order_record.event_id,
      'seat',
      seat_record.seat_id,
      seat_record.zone,
      seat_record.row,
      seat_record.seat_number,
      seat_record.price,
      order_record.customer_first_name || ' ' || order_record.customer_last_name,
      order_record.customer_email,
      order_record.customer_phone
    );
    
    RAISE NOTICE 'Создан билет для места: % % %', seat_record.zone, seat_record.row, seat_record.seat_number;
  END LOOP;
  
  -- Создаем билеты для general access
  FOR general_record IN 
    SELECT * FROM public.order_general_access WHERE order_id = order_uuid
  LOOP
    FOR i IN 1..general_record.quantity LOOP
      INSERT INTO public.tickets (
        order_id, event_id, ticket_type,
        price, holder_name, holder_email, holder_phone
      ) VALUES (
        order_uuid,
        order_record.event_id,
        'general_access',
        general_record.price,
        order_record.customer_first_name || ' ' || order_record.customer_last_name,
        order_record.customer_email,
        order_record.customer_phone
      );
      
      RAISE NOTICE 'Создан general access билет % из %', i, general_record.quantity;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Все билеты для заказа % созданы успешно', order_uuid;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_tickets_updated_at ON public.tickets;
CREATE TRIGGER trigger_update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- 6. Проверяем существующие заказы без билетов и создаем для них билеты
DO $$
DECLARE
    order_without_tickets record;
    tickets_count integer;
BEGIN
    -- Проверяем заказы без билетов
    FOR order_without_tickets IN 
        SELECT o.id, o.short_order_number
        FROM public.orders o
        LEFT JOIN public.tickets t ON o.id = t.order_id
        WHERE t.id IS NULL
        AND o.status != 'cancelled'
        ORDER BY o.created_at DESC
        LIMIT 10  -- Ограничиваем для безопасности
    LOOP
        RAISE NOTICE 'Найден заказ без билетов: % (ID: %)', order_without_tickets.short_order_number, order_without_tickets.id;
        
        -- Создаем билеты для этого заказа
        BEGIN
            PERFORM create_tickets_from_order(order_without_tickets.id);
            
            -- Проверяем, сколько билетов создано
            SELECT COUNT(*) INTO tickets_count 
            FROM public.tickets 
            WHERE order_id = order_without_tickets.id;
            
            RAISE NOTICE 'Создано % билетов для заказа %', tickets_count, order_without_tickets.short_order_number;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Ошибка создания билетов для заказа %: %', order_without_tickets.short_order_number, SQLERRM;
        END;
    END LOOP;
END $$;

-- 7. Финальная проверка
DO $$
DECLARE
    total_orders integer;
    total_tickets integer;
    orders_without_tickets integer;
BEGIN
    SELECT COUNT(*) INTO total_orders FROM public.orders WHERE status != 'cancelled';
    SELECT COUNT(*) INTO total_tickets FROM public.tickets;
    
    SELECT COUNT(*) INTO orders_without_tickets
    FROM public.orders o
    LEFT JOIN public.tickets t ON o.id = t.order_id
    WHERE t.id IS NULL AND o.status != 'cancelled';
    
    RAISE NOTICE '=== СТАТИСТИКА ===';
    RAISE NOTICE 'Всего активных заказов: %', total_orders;
    RAISE NOTICE 'Всего билетов: %', total_tickets;
    RAISE NOTICE 'Заказов без билетов: %', orders_without_tickets;
    
    IF orders_without_tickets = 0 THEN
        RAISE NOTICE 'Отлично! Все заказы имеют билеты.';
    ELSE
        RAISE NOTICE 'Внимание! % заказов не имеют билетов.', orders_without_tickets;
    END IF;
END $$;