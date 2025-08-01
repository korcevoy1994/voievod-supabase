-- Fix ticket creation function to use correct column names

CREATE OR REPLACE FUNCTION public.create_tickets_from_order(order_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  seat_record RECORD;
  ga_record RECORD;
  i INTEGER;
  ticket_data TEXT;
BEGIN
  -- Создание билетов для конкретных мест
  FOR seat_record IN 
    SELECT os.seat_id, os.price
    FROM order_seats os
    WHERE os.order_id = order_uuid
  LOOP
    ticket_data := order_uuid::text || '-' || seat_record.seat_id::text || '-' || EXTRACT(EPOCH FROM now())::text;
    
    INSERT INTO tickets (order_id, seat_id, ticket_number, qr_code)
    VALUES (
      order_uuid,
      seat_record.seat_id,
      generate_ticket_number(),
      generate_qr_code(ticket_data)
    );
  END LOOP;
  
  -- Создание билетов для общего доступа
  FOR ga_record IN 
    SELECT oga.ticket_name, oga.quantity, oga.price
    FROM order_general_access oga
    WHERE oga.order_id = order_uuid
  LOOP
    FOR i IN 1..ga_record.quantity LOOP
      ticket_data := order_uuid::text || '-' || ga_record.ticket_name || '-' || i::text || '-' || EXTRACT(EPOCH FROM now())::text;
      
      INSERT INTO tickets (order_id, seat_id, ticket_number, qr_code, metadata)
      VALUES (
        order_uuid,
        NULL,
        generate_ticket_number(),
        generate_qr_code(ticket_data),
        jsonb_build_object('ticket_name', ga_record.ticket_name, 'ticket_number_in_group', i)
      );
    END LOOP;
  END LOOP;
END;
$$;