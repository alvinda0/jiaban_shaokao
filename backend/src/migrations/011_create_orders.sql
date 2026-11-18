CREATE TABLE IF NOT EXISTS orders (
  id              CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id        CHAR(36)       NOT NULL,
  cashier_id      CHAR(36)       NOT NULL,
  customer_id     CHAR(36),
  invoice_number  VARCHAR(50)    NOT NULL UNIQUE,
  total_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status          ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  note            TEXT,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_orders_store      (store_id),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_status     (status),

  CONSTRAINT fk_orders_store    FOREIGN KEY (store_id)    REFERENCES stores(id)    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_cashier  FOREIGN KEY (cashier_id)  REFERENCES users(id)     ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL
);
