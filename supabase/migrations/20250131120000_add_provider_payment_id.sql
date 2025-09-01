-- Add missing provider_payment_id column to order_payments table
-- This fixes the PGRST204 error where provider_payment_id column was not found

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);

-- Add index for provider_payment_id for better query performance
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);

-- Add comment for documentation
COMMENT ON COLUMN order_payments.provider_payment_id IS 'Payment provider transaction ID';