-- Add event_id column to order_general_access table

ALTER TABLE order_general_access 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_general_access_event_id 
ON order_general_access(event_id);

-- Update existing records to link them to the default event
UPDATE order_general_access 
SET event_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE event_id IS NULL;