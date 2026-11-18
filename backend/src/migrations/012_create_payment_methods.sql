-- METODE PEMBAYARAN
CREATE TYPE payment_method_type AS ENUM ('cash','qris','debit','credit','ewallet','transfer','voucher','other');

CREATE TABLE IF NOT EXISTS payment_methods (
  id                 UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id           UUID                 NOT NULL,
  code               VARCHAR(30)          NOT NULL,        -- cash, qris, debit, gopay, ovo ...
  name               VARCHAR(80)          NOT NULL,
  type               payment_method_type  NOT NULL,
  requires_reference BOOLEAN              NOT NULL DEFAULT false,  -- wajib isi no. approval / ref
  fee_percent        DECIMAL(5,2)         NOT NULL DEFAULT 0,  -- MDR (opsional, untuk laporan)
  sort_order         INT                  NOT NULL DEFAULT 0,
  is_active          BOOLEAN              NOT NULL DEFAULT true,
  created_at         TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_pm_store_code UNIQUE (store_id, code),
  CONSTRAINT fk_pm_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
