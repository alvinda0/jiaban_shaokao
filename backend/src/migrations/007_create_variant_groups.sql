-- VARIAN PRODUCT - Group
-- Group  : "Level Pedas", "Ukuran", "Topping"
CREATE TABLE IF NOT EXISTS variant_groups (
  id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID         NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_required BOOLEAN      NOT NULL DEFAULT false,
  min_select  INT          NOT NULL DEFAULT 0,
  max_select  INT          NOT NULL DEFAULT 1,   -- 1 = pilih satu, >1 = multi (topping)
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_vg_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_vg_product ON variant_groups(product_id);

CREATE TRIGGER update_variant_groups_updated_at BEFORE UPDATE ON variant_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
