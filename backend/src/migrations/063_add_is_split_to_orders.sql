-- Add is_split flag to orders table to quickly identify split orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_split BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for filtering split orders
CREATE INDEX IF NOT EXISTS idx_orders_is_split ON orders(is_split);

-- Update existing orders that have bills
UPDATE orders 
SET is_split = TRUE 
WHERE id IN (
  SELECT DISTINCT order_id 
  FROM order_bills 
  WHERE split_from_order_id IS NOT NULL
);
