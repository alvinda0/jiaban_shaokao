-- User <-> Store (opsional, jika 1 user bisa akses beberapa outlet)
CREATE TABLE IF NOT EXISTS user_stores (
  user_id    CHAR(36) NOT NULL,
  store_id   CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, store_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_us_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
