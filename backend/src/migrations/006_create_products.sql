-- PRODUCT (Menu Item)
-- track_stock = true  -> stok dikurangi saat order & dicek sebelum order
CREATE TABLE IF NOT EXISTS products (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID          NOT NULL,
  category_id UUID          NOT NULL,   -- boleh kategori ATAU sub kategori
  sku         VARCHAR(50)   NULL,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  image_url   VARCHAR(255)  NULL,
  price       DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price  DECIMAL(15,2) NOT NULL DEFAULT 0,   -- HPP (opsional, untuk laporan)
  track_stock BOOLEAN       NOT NULL DEFAULT false,
  stock_qty   DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock   DECIMAL(12,3) NOT NULL DEFAULT 0,   -- batas peringatan stok menipis
  is_available BOOLEAN      NOT NULL DEFAULT true,   -- toggle "habis" manual
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_product_sku UNIQUE (store_id, sku),
  CONSTRAINT fk_products_store    FOREIGN KEY (store_id)    REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
