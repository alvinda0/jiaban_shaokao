-- Add split_from_order_id to track which order this bill was split from
ALTER TABLE order_bills 
ADD COLUMN IF NOT EXISTS split_from_order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL;

-- Add split_method to track how the bill was created
ALTER TABLE order_bills
ADD COLUMN IF NOT EXISTS split_method VARCHAR(20) NULL CHECK (split_method IN ('item', 'amount', 'manual'));

COMMENT ON COLUMN order_bills.split_from_order_id IS 'Original order ID if this bill was created via split';
COMMENT ON COLUMN order_bills.split_method IS 'Method used to split: item, amount, or manual';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_bills_split_from ON order_bills(split_from_order_id) WHERE split_from_order_id IS NOT NULL;
