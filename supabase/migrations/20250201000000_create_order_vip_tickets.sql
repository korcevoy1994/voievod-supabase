-- Create order_vip_tickets table for VIP zone orders

CREATE TABLE IF NOT EXISTS order_vip_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    vip_zone_id UUID NOT NULL,
    ticket_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    event_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT order_vip_tickets_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT order_vip_tickets_vip_zone_id_fkey 
        FOREIGN KEY (vip_zone_id) REFERENCES vip_zones(id) ON DELETE CASCADE,
    CONSTRAINT order_vip_tickets_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE order_vip_tickets ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role has full access to order_vip_tickets" ON order_vip_tickets
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_vip_tickets_order_id ON order_vip_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_order_vip_tickets_vip_zone_id ON order_vip_tickets(vip_zone_id);
CREATE INDEX IF NOT EXISTS idx_order_vip_tickets_event_id ON order_vip_tickets(event_id);