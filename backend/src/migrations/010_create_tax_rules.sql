-- PAJAK (PB1 & Service Charge) - bisa diatur per store
-- apply_take_away = false pada SC  -> SC tidak berlaku untuk take away
CREATE TYPE tax_code AS ENUM ('PB1','SC');

CREATE TABLE IF NOT EXISTS tax_rules (
  id                 UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id           UUID         NOT NULL,
  code               tax_code     NOT NULL,
  name               VARCHAR(50)  NOT NULL,
  rate               DECIMAL(5,2) NOT NULL,                -- persen, mis 10.00
  apply_dine_in      BOOLEAN      NOT NULL DEFAULT true,
  apply_take_away    BOOLEAN      NOT NULL DEFAULT true,
  apply_delivery     BOOLEAN      NOT NULL DEFAULT true,
  include_sc_in_base BOOLEAN      NOT NULL DEFAULT false,      -- PB1: true = dihitung dari (subtotal + SC)
  is_active          BOOLEAN      NOT NULL DEFAULT true,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_tax_store_code UNIQUE (store_id, code),
  CONSTRAINT fk_tax_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON tax_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
