-- Create email_logs table for tracking email sending
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL DEFAULT 'ticket_confirmation',
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  smtp_response TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  
  -- No inline indexes here, will create separately
);

-- Create indexes for better performance
CREATE INDEX idx_email_logs_order_id ON email_logs (order_id);
CREATE INDEX idx_email_logs_recipient ON email_logs (recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs (status);
CREATE INDEX idx_email_logs_created_at ON email_logs (created_at);

-- Add RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin can view all email logs" ON email_logs
  FOR SELECT
  USING (true); -- Will be restricted by application logic

-- Create policy for inserting logs
CREATE POLICY "Service can insert email logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);

-- Create policy for updating logs
CREATE POLICY "Service can update email logs" ON email_logs
  FOR UPDATE
  USING (true);

-- Add comment
COMMENT ON TABLE email_logs IS 'Logs for tracking email sending status and debugging';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email: ticket_confirmation, order_update, etc.';
COMMENT ON COLUMN email_logs.status IS 'Email sending status: sent, failed, pending';
COMMENT ON COLUMN email_logs.error_message IS 'Error message if sending failed';
COMMENT ON COLUMN email_logs.smtp_response IS 'SMTP server response for debugging';