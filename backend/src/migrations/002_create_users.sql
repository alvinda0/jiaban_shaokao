CREATE TABLE IF NOT EXISTS users (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id    UUID         NOT NULL,
  store_id   UUID         NULL,        -- NULL untuk superuser (bisa akses semua store)
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_store_id ON users(store_id);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to stores after stores table is created (will be added in 004)
-- ALTER TABLE users ADD CONSTRAINT fk_users_store
--   FOREIGN KEY (store_id) REFERENCES stores(id)
--   ON UPDATE CASCADE ON DELETE RESTRICT;
