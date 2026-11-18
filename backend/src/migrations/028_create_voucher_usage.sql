CREATE TABLE IF NOT EXISTS voucher_usage (
  id          UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id  UUID      NOT NULL,
  user_id     UUID      NULL,
  order_id    UUID      NULL,
  used_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_usage_voucher
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX idx_usage_voucher ON voucher_usage(voucher_id);
CREATE INDEX idx_usage_user ON voucher_usage(user_id);
