CREATE TABLE IF NOT EXISTS vouchers (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id     CHAR(36)       NOT NULL,
  code         VARCHAR(50)    NOT NULL,
  name         VARCHAR(100)   NOT NULL,
  description  TEXT,
  type         ENUM('percentage', 'fixed') NOT NULL,
  value        DECIMAL(12, 2) NOT NULL,
  min_order    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12, 2),
  quota        INT,
  used_count   INT            NOT NULL DEFAULT 0,
  is_active    TINYINT(1)     NOT NULL DEFAULT 1,
  started_at   DATETIME       NOT NULL,
  expired_at   DATETIME       NOT NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vouchers_code       (code),
  INDEX idx_vouchers_expired_at (expired_at),
  UNIQUE KEY uq_voucher_store_code (store_id, code),

  CONSTRAINT fk_vouchers_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
