-- Simple fix for generate_qr_code function

-- Drop and recreate the function with correct signature
DROP FUNCTION IF EXISTS public.generate_qr_code(text);
DROP FUNCTION IF EXISTS public.generate_qr_code(uuid, text);

CREATE OR REPLACE FUNCTION public.generate_qr_code(ticket_data text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN json_build_object(
    'ticket_data', ticket_data,
    'timestamp', EXTRACT(EPOCH FROM NOW()),
    'checksum', MD5(ticket_data || EXTRACT(EPOCH FROM NOW())::text)
  )::text;
END;
$$;

-- Update create_tickets_from_order function
CREATE OR REPLACE FUNCTION public.create_tickets_from_order(order_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  seat_record RECORD;
  ga_record RECORD;
  i INTEGER;
  ticket_data TEXT;
  order_event_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
  -- Создание билетов для конкретных мест
  FOR seat_record IN 
    SELECT os.seat_id, os.price, os.event_id
    FROM order_seats os
    WHERE os.order_id = order_uuid
  LOOP
    ticket_data := order_uuid::text || '-' || COALESCE(seat_record.seat_id::text, 'no-seat') || '-' || EXTRACT(EPOCH FROM now())::text;
    
    INSERT INTO tickets (order_id, seat_id, ticket_number, qr_code, event_id)
    VALUES (
      order_uuid,
      seat_record.seat_id,
      generate_ticket_number(),
      generate_qr_code(ticket_data),
      COALESCE(seat_record.event_id, order_event_id)
    );
  END LOOP;
  
  -- Создание билетов для общего доступа
  FOR ga_record IN 
    SELECT oga.ticket_name, oga.quantity, oga.price, oga.event_id
    FROM order_general_access oga
    WHERE oga.order_id = order_uuid
  LOOP
    FOR i IN 1..ga_record.quantity LOOP
      ticket_data := order_uuid::text || '-' || COALESCE(ga_record.ticket_name, 'general') || '-' || i::text || '-' || EXTRACT(EPOCH FROM now())::text;
      
      INSERT INTO tickets (order_id, seat_id, ticket_number, qr_code, metadata, event_id)
      VALUES (
        order_uuid,
        NULL,
        generate_ticket_number(),
        generate_qr_code(ticket_data),
        jsonb_build_object('ticket_name', ga_record.ticket_name, 'ticket_number_in_group', i),
        COALESCE(ga_record.event_id, order_event_id)
      );
    END LOOP;
  END LOOP;
END;
$$;