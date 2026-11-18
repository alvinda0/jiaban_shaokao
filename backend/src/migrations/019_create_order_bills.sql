-- SPLIT ORDER SAAT PEMBAYARAN (split per bill)
-- Satu order -> beberapa bill (Bill 1, Bill 2, ...)
-- Item bisa dibagi parsial (qty) lewat order_bill_items.
-- Split berdasarkan nominal / rata cukup pakai banyak baris di `payments`.
CREATE TYPE bill_status AS ENUM ('unpaid','paid','void');

CREATE TABLE IF NOT EXISTS order_bills (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id             UUID          NOT NULL,
  bill_number          INT           NOT NULL,          -- 1,2,3...
  label                VARCHAR(50)   NULL,              -- "Budi", "Meja sebelah"
  subtotal             DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
  service_charge_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_total            DECIMAL(15,2) NOT NULL DEFAULT 0,
  rounding             DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_total           DECIMAL(15,2) NOT NULL DEFAULT 0,
  status               bill_status   NOT NULL DEFAULT 'unpaid',
  paid_at              TIMESTAMP     NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_bill_number UNIQUE (order_id, bill_number),
  CONSTRAINT fk_ob_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_order_bills_updated_at BEFORE UPDATE ON order_bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
