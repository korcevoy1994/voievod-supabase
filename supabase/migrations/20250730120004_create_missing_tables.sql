-- Создание недостающих таблиц

-- Создание таблицы zone_colors
CREATE TABLE IF NOT EXISTS public.zone_colors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  zone character varying NOT NULL UNIQUE,
  color character varying NOT NULL,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zone_colors_pkey PRIMARY KEY (id)
);

-- Создание таблицы zone_pricing
CREATE TABLE IF NOT EXISTS public.zone_pricing (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  zone character varying NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zone_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT zone_pricing_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT zone_pricing_event_zone_unique UNIQUE (event_id, zone)
);

-- Создание таблицы bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying]::text[])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- Создание таблицы booking_seats
CREATE TABLE IF NOT EXISTS public.booking_seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_seats_pkey PRIMARY KEY (id),
  CONSTRAINT booking_seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE CASCADE
);

-- Создание триггеров для обновления updated_at
CREATE TRIGGER trigger_update_zone_colors_updated_at
  BEFORE UPDATE ON public.zone_colors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_zone_pricing_updated_at
  BEFORE UPDATE ON public.zone_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();