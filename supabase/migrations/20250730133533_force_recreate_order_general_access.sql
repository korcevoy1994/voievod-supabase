-- Force recreate order_general_access table to fix schema cache issue

-- Drop existing table completely
DROP TABLE IF EXISTS order_general_access CASCADE;

-- Recreate table with correct structure
CREATE TABLE order_general_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);

-- Add foreign key constraint (if orders table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE order_general_access 
        ADD CONSTRAINT order_general_access_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;