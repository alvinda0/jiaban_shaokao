-- Add paid_total_updated_at column to order_bills
ALTER TABLE order_bills 
ADD COLUMN IF NOT EXISTS paid_total_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_bills_paid_total_updated_at ON order_bills(paid_total_updated_at);
