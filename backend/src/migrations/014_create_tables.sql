CREATE TABLE IF NOT EXISTS tables (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)    NOT NULL,
  number     VARCHAR(20) NOT NULL,
  qr_token   CHAR(64)    NOT NULL UNIQUE,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tables_qr_token (qr_token),
  UNIQUE KEY uq_table_store_number (store_id, number),

  CONSTRAINT fk_tables_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
