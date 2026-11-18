-- SNAPSHOT PAJAK PER ORDER (PB1 / SC)
CREATE TABLE IF NOT EXISTS order_taxes (
  id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID         NOT NULL,
  tax_rule_id UUID         NULL,
  code        tax_code     NOT NULL,
  rate        DECIMAL(5,2) NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_order_tax UNIQUE (order_id, code),
  CONSTRAINT fk_ot_order FOREIGN KEY (order_id)    REFERENCES orders(id)    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ot_rule  FOREIGN KEY (tax_rule_id) REFERENCES tax_rules(id) ON UPDATE CASCADE ON DELETE SET NULL
);
