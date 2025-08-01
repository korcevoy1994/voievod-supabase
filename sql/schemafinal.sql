-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.booking_seats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_seats_pkey PRIMARY KEY (id),
  CONSTRAINT booking_seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id)
);
CREATE TABLE public.bookings (
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
CREATE TABLE public.order_general_access (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  ticket_name character varying NOT NULL DEFAULT 'General Access'::character varying,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_general_access_pkey PRIMARY KEY (id),
  CONSTRAINT order_general_access_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_payments (
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
CREATE TABLE public.order_seats (
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
CREATE TABLE public.orders (
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
CREATE TABLE public.payments (
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
  CONSTRAINT seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT seats_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.users(id)
);
CREATE TABLE public.tickets (
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
CREATE TABLE public.zone_colors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  zone character varying NOT NULL UNIQUE,
  color character varying NOT NULL,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zone_colors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.zone_pricing (
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