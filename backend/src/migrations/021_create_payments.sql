-- PEMBAYARAN (multi metode, multi baris per order/bill)
-- bill_id NULL -> bayar untuk order utuh (atau split nominal)
-- Contoh bayar campur: Cash 100.000 + QRIS 50.000 = 2 baris
CREATE TYPE payment_status AS ENUM ('paid','void','refunded');

CREATE TABLE IF NOT EXISTS payments (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          UUID          NOT NULL,
  bill_id           UUID          NULL,
  payment_method_id UUID          NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,             -- nominal yang dihitung lunas
  tendered_amount   DECIMAL(15,2) NULL,                 -- uang diterima (cash)
  change_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,   -- kembalian
  reference_no      VARCHAR(100)  NULL,                 -- no. approval EDC / ref QRIS
  status            payment_status NOT NULL DEFAULT 'paid',
  paid_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by       UUID          NULL,                 -- kasir/captain
  voided_by         UUID          NULL,
  void_reason       VARCHAR(255)  NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pay_order  FOREIGN KEY (order_id)          REFERENCES orders(id)          ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_bill   FOREIGN KEY (bill_id)           REFERENCES order_bills(id)     ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_user   FOREIGN KEY (received_by)       REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_void   FOREIGN KEY (voided_by)         REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_pay_order ON payments(order_id);
CREATE INDEX idx_pay_bill ON payments(bill_id);
CREATE INDEX idx_pay_method ON payments(payment_method_id);
CREATE INDEX idx_pay_paid ON payments(paid_at);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
