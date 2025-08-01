-- Fix generate_qr_code function to resolve text = uuid operator error

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.generate_qr_code(text);
DROP FUNCTION IF EXISTS public.generate_qr_code(uuid, text);

-- Create the correct function that accepts single text parameter
CREATE OR REPLACE FUNCTION public.generate_qr_code(ticket_data text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate QR code as JSON string with ticket information
  RETURN json_build_object(
    'ticket_data', ticket_data,
    'timestamp', EXTRACT(EPOCH FROM NOW()),
    'checksum', MD5(ticket_data || EXTRACT(EPOCH FROM NOW())::text)
  )::text;
END;
$$;

-- Ensure generate_ticket_number function exists
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
END;
$$;

-- Test the function to ensure it works
DO $$
DECLARE
  test_result text;
BEGIN
  test_result := generate_qr_code('test-data');
  RAISE NOTICE 'QR code function test result: %', test_result;
END;
$$;