CREATE TABLE IF NOT EXISTS order_items (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id     CHAR(36)       NOT NULL,
  variant_id   CHAR(36)       NOT NULL,
  name         VARCHAR(150)   NOT NULL,
  variant_name VARCHAR(100)   NOT NULL,
  price        DECIMAL(12, 2) NOT NULL,
  qty          INT            NOT NULL,
  subtotal     DECIMAL(12, 2) NOT NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_oi_order (order_id),

  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)           ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
