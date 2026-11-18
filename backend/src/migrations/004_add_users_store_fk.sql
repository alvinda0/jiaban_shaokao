-- Add foreign key constraint from users to stores
-- This is done after stores table is created

ALTER TABLE users ADD CONSTRAINT fk_users_store
  FOREIGN KEY (store_id) REFERENCES stores(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
