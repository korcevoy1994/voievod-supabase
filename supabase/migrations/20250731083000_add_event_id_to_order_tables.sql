-- Add event_id column to order_seats and order_general_access tables

-- Add event_id to order_seats table
ALTER TABLE order_seats 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Add event_id to order_general_access table
ALTER TABLE order_general_access 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_seats_event_id ON order_seats(event_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_event_id ON order_general_access(event_id);

-- Update existing records to have event_id (if any exist)
-- This assumes there's only one active event, otherwise manual data migration needed
UPDATE order_seats 
SET event_id = (
    SELECT id FROM events 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE event_id IS NULL;

UPDATE order_general_access 
SET event_id = (
    SELECT id FROM events 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE event_id IS NULL;