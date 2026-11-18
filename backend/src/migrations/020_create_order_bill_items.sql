-- ORDER BILL ITEMS
-- Item yang masuk ke dalam bill tertentu saat split pembayaran
CREATE TABLE IF NOT EXISTS order_bill_items (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id       UUID          NOT NULL,
  order_item_id UUID          NOT NULL,
  qty           INT           NOT NULL DEFAULT 1,       -- porsi yang masuk bill ini
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,       -- nilai bagian bill ini (setelah diskon)

  CONSTRAINT uq_bill_item UNIQUE (bill_id, order_item_id),
  CONSTRAINT fk_obi_bill FOREIGN KEY (bill_id)       REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_obi_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_obi_item ON order_bill_items(order_item_id);
