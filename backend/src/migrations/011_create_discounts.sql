-- MASTER DISKON (bisa dipilih di awal order atau saat pembayaran)
-- scope 'item'  -> potong per item menu
-- scope 'order' -> potong total order
CREATE TYPE discount_scope AS ENUM ('item','order');
CREATE TYPE discount_type AS ENUM ('percent','fixed');

CREATE TABLE IF NOT EXISTS discounts (
  id                UUID            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          UUID            NOT NULL,
  name              VARCHAR(100)    NOT NULL,
  scope             discount_scope  NOT NULL DEFAULT 'order',
  type              discount_type   NOT NULL,
  value             DECIMAL(15,2)   NOT NULL,
  max_discount      DECIMAL(15,2)   NULL,        -- plafon untuk diskon persen
  min_order_amount  DECIMAL(15,2)   NULL,
  allow_at_order    BOOLEAN         NOT NULL DEFAULT true,   -- boleh dipasang di awal order
  allow_at_payment  BOOLEAN         NOT NULL DEFAULT true,   -- boleh dipasang saat bayar
  requires_approval BOOLEAN         NOT NULL DEFAULT false,   -- perlu PIN admin
  start_at          TIMESTAMP       NULL,
  end_at            TIMESTAMP       NULL,
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_discounts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_discounts_store ON discounts(store_id);

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
