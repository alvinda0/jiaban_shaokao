CREATE TABLE IF NOT EXISTS product_variants (
  id         CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  product_id CHAR(36)       NOT NULL,
  name       VARCHAR(100)   NOT NULL,
  price      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active  TINYINT(1)     NOT NULL DEFAULT 1,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_variants_product (product_id),

  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
);
