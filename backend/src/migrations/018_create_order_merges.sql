-- GABUNG ORDER (log)
-- Proses: pindahkan order_items source -> target, set source.status='merged'
CREATE TABLE IF NOT EXISTS order_merges (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_order_id UUID      NOT NULL,
  source_order_id UUID      NOT NULL,
  merged_by       UUID      NULL,
  merged_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_om_target FOREIGN KEY (target_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_om_source FOREIGN KEY (source_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_om_user   FOREIGN KEY (merged_by)       REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_om_target ON order_merges(target_order_id);
CREATE INDEX idx_om_source ON order_merges(source_order_id);
