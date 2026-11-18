-- ITEM ORDER
-- product_name & unit_price = snapshot (aman jika produk diubah kemudian)
-- original_order_id          = asal item sebelum digabung
CREATE TYPE order_item_status AS ENUM ('pending','preparing','ready','served','void');

CREATE TABLE IF NOT EXISTS order_items (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id             UUID          NOT NULL,
  original_order_id    UUID          NULL,
  product_id           UUID          NOT NULL,
  product_name         VARCHAR(150)  NOT NULL,
  qty                  INT           NOT NULL DEFAULT 1,
  unit_price           DECIMAL(15,2) NOT NULL,          -- harga dasar produk
  variant_total        DECIMAL(15,2) NOT NULL DEFAULT 0, -- total tambahan varian per 1 qty
  discount_amount      DECIMAL(15,2) NOT NULL DEFAULT 0, -- total diskon untuk baris ini
  line_total           DECIMAL(15,2) NOT NULL DEFAULT 0, -- (unit_price+variant_total)*qty - discount
  notes                VARCHAR(255)  NULL,               -- "jangan pakai bawang"
  status               order_item_status NOT NULL DEFAULT 'pending',

  -- complement per item
  is_complimentary     BOOLEAN       NOT NULL DEFAULT false,
  complimentary_reason VARCHAR(255)  NULL,
  complimentary_by     UUID          NULL,

  voided_by            UUID          NULL,
  void_reason          VARCHAR(255)  NULL,
  sent_to_kitchen_at   TIMESTAMP     NULL,
  created_by           UUID          NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_oi_order    FOREIGN KEY (order_id)          REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_original FOREIGN KEY (original_order_id) REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_product  FOREIGN KEY (product_id)        REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_oi_comp     FOREIGN KEY (complimentary_by)  REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_void     FOREIGN KEY (voided_by)         REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_user     FOREIGN KEY (created_by)        REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_oi_order ON order_items(order_id);
CREATE INDEX idx_oi_product ON order_items(product_id);
CREATE INDEX idx_oi_status ON order_items(status);

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
