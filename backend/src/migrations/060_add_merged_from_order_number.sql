-- Add merged_from_order_number column to order_items table
ALTER TABLE order_items 
ADD COLUMN merged_from_order_number VARCHAR(50) NULL;

-- Add index for faster queries
CREATE INDEX idx_order_items_merged_from ON order_items(merged_from_order_number) WHERE merged_from_order_number IS NOT NULL;

COMMENT ON COLUMN order_items.merged_from_order_number IS 'Order number of the source order when this item was moved via merge';
