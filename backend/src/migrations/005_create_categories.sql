-- KATEGORI & SUB KATEGORI (self reference lewat parent_id)
-- Contoh: Makanan -> Nasi, Mie | Minuman -> Kopi, Jus
CREATE TABLE IF NOT EXISTS categories (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id   UUID         NOT NULL,
  parent_id  UUID         NULL,
  name       VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_category_name UNIQUE (store_id, parent_id, name),
  CONSTRAINT fk_categories_store  FOREIGN KEY (store_id)  REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
