-- Add missing payment_method column to order_payments table
-- This fixes the PGRST204 error where payment_method column was not found

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Update existing records to have a default payment_method based on provider
UPDATE order_payments 
SET payment_method = CASE 
    WHEN provider = 'maib' THEN 'card'
    WHEN provider = 'cash' THEN 'cash'
    ELSE 'card'
END
WHERE payment_method IS NULL;

-- Make payment_method NOT NULL after setting default values
ALTER TABLE order_payments 
ALTER COLUMN payment_method SET NOT NULL;

-- Add default value for future inserts
ALTER TABLE order_payments 
ALTER COLUMN payment_method SET DEFAULT 'card';

-- Add comment for documentation
COMMENT ON COLUMN order_payments.payment_method IS 'Payment method: card, cash, etc.';