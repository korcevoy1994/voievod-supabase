-- Восстановление полной схемы базы данных

-- Создание таблицы users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  full_name character varying,
  phone character varying,
  is_temporary boolean DEFAULT false,
  temp_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Создание таблицы events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  venue character varying NOT NULL,
  event_date timestamp with time zone NOT NULL,
  doors_open timestamp with time zone,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'cancelled'::character varying, 'postponed'::character varying, 'sold_out'::character varying]::text[])),
  total_seats integer DEFAULT 0,
  available_seats integer DEFAULT 0,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- Создание таблицы seats
CREATE TABLE IF NOT EXISTS public.seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  zone character varying NOT NULL,
  row character varying NOT NULL,
  number character varying NOT NULL,
  price numeric,
  custom_price boolean DEFAULT false,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying, 'reserved'::character varying, 'pending_payment'::character varying, 'sold'::character varying, 'blocked'::character varying]::text[])),
  reserved_by uuid,
  expires_at timestamp with time zone,
  x_coordinate numeric,
  y_coordinate numeric,
  zone_color character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid,
  CONSTRAINT seats_pkey PRIMARY KEY (id),
  CONSTRAINT seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT seats_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.users(id)
);

-- Создание таблицы orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id character varying NOT NULL,
  customer_email character varying NOT NULL,
  customer_first_name character varying NOT NULL,
  customer_last_name character varying NOT NULL,
  customer_phone character varying,
  total_price numeric NOT NULL,
  total_tickets integer NOT NULL,
  payment_method character varying NOT NULL DEFAULT 'card'::character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  pdf_generated boolean DEFAULT false,
  pdf_url text,
  qr_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid,
  short_order_number character varying UNIQUE,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Создание таблицы tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  event_id uuid NOT NULL,
  ticket_number character varying NOT NULL UNIQUE,
  qr_code text NOT NULL UNIQUE,
  ticket_type character varying NOT NULL DEFAULT 'seat'::character varying,
  seat_id uuid,
  zone character varying,
  row character varying,
  seat_number character varying,
  price numeric NOT NULL,
  status character varying NOT NULL DEFAULT 'valid'::character varying CHECK (status::text = ANY (ARRAY['valid'::character varying, 'used'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[])),
  holder_name character varying NOT NULL,
  holder_email character varying NOT NULL,
  holder_phone character varying,
  scanned_at timestamp with time zone,
  scanned_by character varying,
  entry_gate character varying,
  pdf_generated boolean DEFAULT false,
  pdf_url text,
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id),
  CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Создание остальных таблиц
CREATE TABLE IF NOT EXISTS public.order_seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  zone character varying NOT NULL,
  row character varying NOT NULL,
  number character varying NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_seats_pkey PRIMARY KEY (id),
  CONSTRAINT order_seats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id)
);

CREATE TABLE IF NOT EXISTS public.order_general_access (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  ticket_name character varying NOT NULL DEFAULT 'General Access'::character varying,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_general_access_pkey PRIMARY KEY (id),
  CONSTRAINT order_general_access_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  payment_provider character varying DEFAULT 'maib'::character varying,
  provider_payment_id character varying,
  provider_data jsonb,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT order_payments_pkey PRIMARY KEY (id),
  CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE IF NOT EXISTS public.zone_colors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  zone character varying NOT NULL UNIQUE,
  color character varying NOT NULL,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zone_colors_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.zone_pricing (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  zone character varying NOT NULL UNIQUE,
  base_price numeric NOT NULL,
  row_multipliers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid NOT NULL,
  CONSTRAINT zone_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT fk_zone_pricing_event_id FOREIGN KEY (event_id) REFERENCES public.events(id)
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'expired'::character varying]::text[])),
  customer_info jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

CREATE TABLE IF NOT EXISTS public.booking_seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_seats_pkey PRIMARY KEY (id),
  CONSTRAINT booking_seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  payment_provider character varying DEFAULT 'stripe'::character varying,
  provider_payment_id character varying,
  provider_data jsonb,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);

-- Функции для автоматического создания билетов
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_num TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Генерируем номер билета в формате VOEV-YYYYMMDD-XXXXXX
        ticket_num := 'VOEV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000)::TEXT, 6, '0');
        
        -- Проверяем уникальность
        IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE ticket_number = ticket_num) THEN
            RETURN ticket_num;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный номер билета';
        END IF;
        
        -- Небольшая задержка для изменения времени
        PERFORM pg_sleep(0.001);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_qr_code(ticket_id UUID, ticket_number TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Генерируем QR код на основе ID билета и номера
    RETURN encode(digest(ticket_id::TEXT || ticket_number || NOW()::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tickets_from_order(order_uuid UUID)
RETURNS VOID AS $$
DECLARE
    order_record RECORD;
    seat_record RECORD;
    general_record RECORD;
    ticket_id UUID;
    ticket_num TEXT;
    qr_code_val TEXT;
    i INTEGER;
BEGIN
    -- Получаем информацию о заказе
    SELECT * INTO order_record FROM public.orders WHERE id = order_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Заказ с ID % не найден', order_uuid;
    END IF;
    
    -- Создаем билеты для мест
    FOR seat_record IN 
        SELECT os.*, s.id as seat_uuid
        FROM public.order_seats os
        LEFT JOIN public.seats s ON s.zone = os.zone AND s.row = os.row AND s.number = os.number
        WHERE os.order_id = order_uuid
    LOOP
        ticket_id := gen_random_uuid();
        ticket_num := generate_ticket_number();
        qr_code_val := generate_qr_code(ticket_id, ticket_num);
        
        INSERT INTO public.tickets (
            id, order_id, event_id, ticket_number, qr_code, ticket_type,
            seat_id, zone, row, seat_number, price,
            holder_name, holder_email, holder_phone
        ) VALUES (
            ticket_id, order_uuid, order_record.event_id, ticket_num, qr_code_val, 'seat',
            seat_record.seat_uuid, seat_record.zone, seat_record.row, seat_record.number, seat_record.price,
            order_record.customer_first_name || ' ' || order_record.customer_last_name,
            order_record.customer_email, order_record.customer_phone
        );
    END LOOP;
    
    -- Создаем билеты для general access
    FOR general_record IN 
        SELECT * FROM public.order_general_access WHERE order_id = order_uuid
    LOOP
        FOR i IN 1..general_record.quantity LOOP
            ticket_id := gen_random_uuid();
            ticket_num := generate_ticket_number();
            qr_code_val := generate_qr_code(ticket_id, ticket_num);
            
            INSERT INTO public.tickets (
                id, order_id, event_id, ticket_number, qr_code, ticket_type,
                price, holder_name, holder_email, holder_phone
            ) VALUES (
                ticket_id, order_uuid, order_record.event_id, ticket_num, qr_code_val, 'general',
                general_record.price,
                order_record.customer_first_name || ' ' || order_record.customer_last_name,
                order_record.customer_email, order_record.customer_phone
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_create_tickets_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем билеты только при изменении статуса на 'paid'
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        PERFORM create_tickets_from_order(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического создания билетов
CREATE TRIGGER trigger_auto_create_tickets_on_payment
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
    EXECUTE FUNCTION auto_create_tickets_on_payment();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON public.seats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();