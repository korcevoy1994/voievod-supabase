-- Fix generate_qr_code function to accept single parameter

CREATE OR REPLACE FUNCTION public.generate_qr_code(ticket_data text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'QR-' || ENCODE(SHA256(ticket_data::bytea), 'hex');
END;
$$;

-- Also ensure generate_ticket_number function existsa
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
END;
$$;