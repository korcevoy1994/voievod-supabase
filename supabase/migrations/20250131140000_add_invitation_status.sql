-- Add invitation status to orders
-- This migration adds support for invitation orders

-- Add a comment to document the new status
COMMENT ON COLUMN orders.status IS 'Order status: pending, payment_pending, paid, refunded, invitation';

-- Create an index for invitation orders for better performance
CREATE INDEX IF NOT EXISTS idx_orders_invitation_status ON orders(status) WHERE status = 'invitation';

-- Update any existing orders that should be invitations (if needed)
-- This is commented out as it should be done manually if needed
-- UPDATE orders SET status = 'invitation' WHERE <condition>;

-- Add a function to create invitation orders
CREATE OR REPLACE FUNCTION create_invitation_order(
    p_user_id VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_customer_first_name VARCHAR(255),
    p_customer_last_name VARCHAR(255),
    p_customer_phone VARCHAR(50) DEFAULT NULL,
    p_total_tickets INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
BEGIN
    INSERT INTO orders (
        user_id,
        customer_email,
        customer_first_name,
        customer_last_name,
        customer_phone,
        total_price,
        total_tickets,
        payment_method,
        status,
        pdf_generated
    ) VALUES (
        p_user_id,
        p_customer_email,
        p_customer_first_name,
        p_customer_last_name,
        p_customer_phone,
        0.00, -- Invitations are free
        p_total_tickets,
        'invitation', -- Special payment method for invitations
        'invitation', -- Status is invitation
        FALSE
    ) RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Add a function to check if an order is an invitation
CREATE OR REPLACE FUNCTION is_invitation_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    SELECT status INTO v_status FROM orders WHERE id = p_order_id;
    RETURN v_status = 'invitation';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_invitation_order TO service_role;
GRANT EXECUTE ON FUNCTION is_invitation_order TO service_role;