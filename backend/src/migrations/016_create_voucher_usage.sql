CREATE TABLE IF NOT EXISTS voucher_usage (
  id         CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  voucher_id CHAR(36)       NOT NULL,
  order_id   CHAR(36)       NOT NULL UNIQUE,
  discount   DECIMAL(12, 2) NOT NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vu_voucher (voucher_id),

  CONSTRAINT fk_vu_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vu_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE CASCADE
);
