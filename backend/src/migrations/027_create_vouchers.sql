CREATE TYPE voucher_type AS ENUM ('discount', 'bundle');
CREATE TYPE voucher_discount_type AS ENUM ('percentage', 'fixed');

CREATE TABLE IF NOT EXISTS vouchers (
  id              UUID                   NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id        UUID                   NULL,
  code            VARCHAR(50)            NOT NULL UNIQUE,
  name            VARCHAR(100)           NOT NULL,
  description     TEXT,
  
  type            voucher_type           NOT NULL DEFAULT 'discount',
  
  discount_type   voucher_discount_type  NULL,
  discount_value  DECIMAL(10,2)          NULL,
  
  bundle_product_id UUID                 NULL,
  bundle_qty        INT                  NULL,
  bundle_price      DECIMAL(10,2)        NULL,
  
  min_purchase    DECIMAL(10,2)          NULL DEFAULT 0,
  max_discount    DECIMAL(10,2)          NULL,
  
  usage_limit     INT                    NULL,
  usage_count     INT                    NOT NULL DEFAULT 0,
  usage_per_user  INT                    NULL,
  
  valid_from      TIMESTAMP              NOT NULL,
  valid_until     TIMESTAMP              NOT NULL,
  
  is_active       BOOLEAN                NOT NULL DEFAULT true,
  created_at      TIMESTAMP              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_vouchers_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
    
  CONSTRAINT fk_vouchers_bundle_product
    FOREIGN KEY (bundle_product_id) REFERENCES products(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_store_id ON vouchers(store_id);
CREATE INDEX idx_vouchers_type ON vouchers(type);
CREATE INDEX idx_vouchers_valid ON vouchers(valid_from, valid_until);

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
