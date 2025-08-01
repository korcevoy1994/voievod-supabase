-- Add event_id column to order_payments table

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_payments_event_id ON order_payments(event_id);

-- Update existing records to have the default event_id
UPDATE order_payments 
SET event_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE event_id IS NULL;