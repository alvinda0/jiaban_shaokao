-- Add bill_id column to order_discounts for split-specific discounts
-- This allows tracking which bill a discount applies to (for split payment promo)

ALTER TABLE order_discounts 
ADD COLUMN bill_id UUID NULL;

-- Add foreign key constraint
ALTER TABLE order_discounts 
ADD CONSTRAINT fk_od_bill FOREIGN KEY (bill_id) REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_od_bill ON order_discounts(bill_id);

-- Add column to track when bill totals were last updated (for recalc check)
ALTER TABLE order_bills 
ADD COLUMN paid_total_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
