-- Add all missing columns to order_payments table to match API expectations
-- This fixes multiple PGRST204 errors for missing columns

-- Add provider_data column for storing additional payment provider data
ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS provider_data JSONB;

-- Add created_at column if it doesn't exist
ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add completed_at column for tracking payment completion time
ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have created_at if null
UPDATE order_payments 
SET created_at = NOW()
WHERE created_at IS NULL;

-- Make created_at NOT NULL
ALTER TABLE order_payments 
ALTER COLUMN created_at SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN order_payments.provider_data IS 'Additional data from payment provider (JSON)';
COMMENT ON COLUMN order_payments.created_at IS 'Payment record creation timestamp';
COMMENT ON COLUMN order_payments.completed_at IS 'Payment completion timestamp';

-- Add index for created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_order_payments_created_at ON order_payments(created_at);