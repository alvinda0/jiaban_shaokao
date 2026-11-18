-- RIWAYAT STOK (ledger)
CREATE TYPE stock_movement_type AS ENUM ('purchase','sale','void_return','adjustment','waste','opname');

CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID                  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id       UUID                  NOT NULL,
  product_id     UUID                  NOT NULL,
  type           stock_movement_type   NOT NULL,
  qty_change     DECIMAL(12,3)         NOT NULL,          -- + masuk, - keluar
  qty_after      DECIMAL(12,3)         NOT NULL,
  reference_type VARCHAR(30)           NULL,               -- mis: 'order_item'
  reference_id   UUID                  NULL,
  notes          VARCHAR(255)          NULL,
  created_by     UUID                  NULL,
  created_at     TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_sm_store   FOREIGN KEY (store_id)   REFERENCES stores(id)   ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sm_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sm_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_sm_product_date ON stock_movements(product_id, created_at);
CREATE INDEX idx_sm_store ON stock_movements(store_id);
CREATE INDEX idx_sm_ref ON stock_movements(reference_type, reference_id);
