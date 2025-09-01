-- Add completed_at column to order_payments table
-- This column stores the timestamp when payment was completed

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance on completed_at
CREATE INDEX IF NOT EXISTS idx_order_payments_completed_at 
ON order_payments (completed_at);

-- Add comment for documentation
COMMENT ON COLUMN order_payments.completed_at IS 'Timestamp when payment was completed';