-- Add missing payment_provider column to order_payments table
-- This fixes the PGRST204 error where payment_provider column was not found

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);

-- Update existing records to copy provider value to payment_provider
UPDATE order_payments 
SET payment_provider = provider
WHERE payment_provider IS NULL;

-- Make payment_provider NOT NULL after setting default values
ALTER TABLE order_payments 
ALTER COLUMN payment_provider SET NOT NULL;

-- Add default value for future inserts
ALTER TABLE order_payments 
ALTER COLUMN payment_provider SET DEFAULT 'maib';

-- Add comment for documentation
COMMENT ON COLUMN order_payments.payment_provider IS 'Payment provider: maib, stripe, etc.';