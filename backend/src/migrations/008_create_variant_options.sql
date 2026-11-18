-- VARIAN PRODUCT - Options
-- Option : "Tidak Pedas", "Pedas", "Extra Pedas (+2000)"
CREATE TABLE IF NOT EXISTS variant_options (
  id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_group_id UUID          NOT NULL,
  name             VARCHAR(100)  NOT NULL,
  price_adjustment DECIMAL(15,2) NOT NULL DEFAULT 0,   -- tambahan harga (boleh negatif)
  is_default       BOOLEAN       NOT NULL DEFAULT false,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_vo_group FOREIGN KEY (variant_group_id) REFERENCES variant_groups(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_vo_group ON variant_options(variant_group_id);

CREATE TRIGGER update_variant_options_updated_at BEFORE UPDATE ON variant_options
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
