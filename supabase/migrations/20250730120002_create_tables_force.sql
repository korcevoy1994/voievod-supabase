-- Принудительное создание таблиц

-- Удаление существующих таблиц если они есть
DROP TABLE IF EXISTS public.booking_seats CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.zone_pricing CASCADE;
DROP TABLE IF EXISTS public.zone_colors CASCADE;
DROP TABLE IF EXISTS public.order_payments CASCADE;
DROP TABLE IF EXISTS public.order_general_access CASCADE;
DROP TABLE IF EXISTS public.order_seats CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.seats CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Удаление функций
DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_qr_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.create_tickets_from_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Создание таблицы users
CREATE TABLE public.users (
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
CREATE TABLE public.events (
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
CREATE TABLE public.seats (
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
  CONSTRAINT seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT seats_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Создание таблицы orders
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'cancelled'::character varying, 'refunded'::character varying]::text[])),
  payment_method character varying,
  payment_reference character varying,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT orders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- Создание таблицы tickets
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  seat_id uuid,
  ticket_number character varying NOT NULL UNIQUE,
  qr_code text NOT NULL UNIQUE,
  status character varying DEFAULT 'valid'::character varying CHECK (status::text = ANY (ARRAY['valid'::character varying, 'used'::character varying, 'cancelled'::character varying]::text[])),
  used_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT tickets_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL
);

-- Создание остальных таблиц
CREATE TABLE public.order_seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_seats_pkey PRIMARY KEY (id),
  CONSTRAINT order_seats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT order_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE CASCADE
);

CREATE TABLE public.order_general_access (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  zone character varying NOT NULL,
  quantity integer NOT NULL,
  price_per_ticket numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_general_access_pkey PRIMARY KEY (id),
  CONSTRAINT order_general_access_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Создание функций
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_qr_code(ticket_data text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'QR-' || ENCODE(SHA256(ticket_data::bytea), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Создание триггеров
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_seats_updated_at
  BEFORE UPDATE ON public.seats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();