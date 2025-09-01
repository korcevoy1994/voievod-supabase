-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.booking_seats (
  booking_id uuid NOT NULL,
  seat_id uuid NOT NULL,
  price numeric NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_seats_pkey PRIMARY KEY (id),
  CONSTRAINT booking_seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id)
);
CREATE TABLE public.bookings (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total_amount numeric NOT NULL,
  expires_at timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'confirmed'::character varying::text, 'cancelled'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.events (
  title character varying NOT NULL,
  description text,
  venue character varying NOT NULL,
  event_date timestamp with time zone NOT NULL,
  doors_open timestamp with time zone,
  image_url text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'cancelled'::character varying::text, 'postponed'::character varying::text, 'sold_out'::character varying::text])),
  total_seats integer DEFAULT 0,
  available_seats integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_general_access (
  order_id text NOT NULL,
  price numeric NOT NULL,
  event_id text,
  id text NOT NULL DEFAULT generate_unique_short_id('order_general_access_new'::text),
  ticket_name character varying NOT NULL DEFAULT 'General Access'::character varying,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_general_access_pkey PRIMARY KEY (id),
  CONSTRAINT order_general_access_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_payments (
  event_id uuid,
  provider_payment_id character varying,
  provider_data jsonb,
  currency character varying DEFAULT 'MDL'::character varying,
  completed_at timestamp with time zone,
  order_id text NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  payment_provider character varying,
  payment_reference character varying,
  id text NOT NULL DEFAULT generate_unique_short_id('order_payments_new'::text),
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_payments_pkey PRIMARY KEY (id),
  CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_payments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.order_seats (
  event_id uuid,
  order_id text NOT NULL,
  seat_id character varying NOT NULL,
  price numeric NOT NULL,
  id text NOT NULL DEFAULT generate_unique_short_id('order_seats_new'::text),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_seats_pkey PRIMARY KEY (id),
  CONSTRAINT order_seats_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.orders (
  user_id character varying NOT NULL,
  customer_email character varying NOT NULL,
  customer_first_name character varying NOT NULL,
  customer_last_name character varying NOT NULL,
  customer_phone character varying,
  total_price numeric NOT NULL,
  total_tickets integer NOT NULL,
  pdf_url text,
  qr_code text,
  event_id text,
  id text NOT NULL DEFAULT generate_unique_short_id('orders_new'::text),
  payment_method character varying NOT NULL DEFAULT 'card'::character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  pdf_generated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  booking_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  provider_payment_id character varying,
  provider_data jsonb,
  completed_at timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  payment_provider character varying DEFAULT 'stripe'::character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'failed'::character varying::text, 'cancelled'::character varying::text, 'refunded'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.seats (
  zone character varying NOT NULL,
  row character varying NOT NULL,
  number character varying NOT NULL,
  price numeric,
  reserved_by uuid,
  expires_at timestamp with time zone,
  x_coordinate numeric,
  y_coordinate numeric,
  zone_color character varying,
  event_id uuid,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  custom_price boolean DEFAULT false,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying::text, 'reserved'::character varying::text, 'pending_payment'::character varying::text, 'sold'::character varying::text, 'blocked'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seats_pkey PRIMARY KEY (id),
  CONSTRAINT seats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT seats_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.users(id)
);
CREATE TABLE public.tickets (
  order_id uuid NOT NULL,
  seat_id uuid,
  ticket_number character varying NOT NULL UNIQUE,
  qr_code text NOT NULL UNIQUE,
  used_at timestamp with time zone,
  metadata jsonb,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status character varying DEFAULT 'valid'::character varying CHECK (status::text = ANY (ARRAY['valid'::character varying::text, 'used'::character varying::text, 'cancelled'::character varying::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id),
  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.users (
  email character varying NOT NULL UNIQUE,
  full_name character varying,
  phone character varying,
  temp_expires_at timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_temporary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.zone_colors (
  zone character varying NOT NULL UNIQUE,
  color character varying NOT NULL,
  name character varying,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zone_colors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.zone_pricing (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid NOT NULL,
  zone character varying NOT NULL,
  price numeric NOT NULL,
  CONSTRAINT zone_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT zone_pricing_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);