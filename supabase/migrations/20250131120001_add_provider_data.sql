-- Add provider_data column to order_payments table
-- This column stores additional data from payment providers as JSON

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS provider_data JSONB;

-- Add index for better query performance on provider_data
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_data 
ON order_payments USING gin (provider_data);

-- Add comment for documentation
COMMENT ON COLUMN order_payments.provider_data IS 'Additional data from payment provider (JSON)';