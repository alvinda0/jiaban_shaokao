-- Create bill_items table to track which items belong to which bill
-- This is needed when splitting by item
CREATE TABLE IF NOT EXISTS bill_items (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id           UUID          NOT NULL,
  order_item_id     UUID          NOT NULL,
  quantity          INT           NOT NULL DEFAULT 1,
  unit_price        DECIMAL(15,2) NOT NULL,
  line_total        DECIMAL(15,2) NOT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_bi_bill FOREIGN KEY (bill_id) REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_bi_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_order_item_id ON bill_items(order_item_id);
