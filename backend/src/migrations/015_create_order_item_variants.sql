-- Varian yang dipilih per item (snapshot nama & harga)
CREATE TABLE IF NOT EXISTS order_item_variants (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id     UUID          NOT NULL,
  variant_option_id UUID          NULL,
  group_name        VARCHAR(100)  NOT NULL,
  option_name       VARCHAR(100)  NOT NULL,
  price_adjustment  DECIMAL(15,2) NOT NULL DEFAULT 0,

  CONSTRAINT fk_oiv_item   FOREIGN KEY (order_item_id)     REFERENCES order_items(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oiv_option FOREIGN KEY (variant_option_id) REFERENCES variant_options(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_oiv_item ON order_item_variants(order_item_id);
