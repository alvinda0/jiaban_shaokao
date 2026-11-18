CREATE TABLE IF NOT EXISTS payments (
  id            CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id      CHAR(36)       NOT NULL,
  method        ENUM('cash', 'transfer', 'qris', 'card') NOT NULL,
  amount        DECIMAL(12, 2) NOT NULL,
  change_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_payments_order (order_id),

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE
);
