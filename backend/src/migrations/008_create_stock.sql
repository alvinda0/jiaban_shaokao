CREATE TABLE IF NOT EXISTS stock (
  id         CHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)   NOT NULL,
  variant_id CHAR(36)   NOT NULL,
  qty        INT        NOT NULL DEFAULT 0,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_stock_store_variant (store_id, variant_id),

  CONSTRAINT fk_stock_store   FOREIGN KEY (store_id)   REFERENCES stores(id)           ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_stock_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE CASCADE
);
