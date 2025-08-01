-- Fix orders table structure
-- This migration recreates the orders table with the correct schema

-- Drop existing table and recreate with correct structure
DROP TABLE IF EXISTS orders CASCADE;

-- Create orders table with correct columns
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_price DECIMAL(10,2) NOT NULL,
    total_tickets INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recreate related tables if they exist
-- order_seats table
CREATE TABLE IF NOT EXISTS order_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- order_general_access table
CREATE TABLE IF NOT EXISTS order_general_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_name VARCHAR(255) NOT NULL DEFAULT 'General Access',
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- order_payments table
CREATE TABLE IF NOT EXISTS order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MDL',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on related tables
ALTER TABLE order_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_general_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for related tables
CREATE POLICY "Service role has full access to order_seats" ON order_seats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_general_access" ON order_general_access
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to order_payments" ON order_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for related tables
CREATE INDEX IF NOT EXISTS idx_order_seats_order_id ON order_seats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seats_seat_id ON order_seats(seat_id);
CREATE INDEX IF NOT EXISTS idx_order_general_access_order_id ON order_general_access(order_id);
-- No event_id index needed for order_general_access
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);

-- Create triggers for updated_at on related tables
CREATE TRIGGER update_order_payments_updated_at BEFORE UPDATE ON order_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();