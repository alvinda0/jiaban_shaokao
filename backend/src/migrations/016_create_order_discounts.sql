-- DISKON YANG DIPAKAI
-- applied_stage : 'order'   = dimasukkan di awal / saat order
--                 'payment' = dimasukkan saat pembayaran
-- order_item_id NULL -> diskon level order, terisi -> diskon level item
CREATE TYPE applied_stage AS ENUM ('order','payment');

CREATE TABLE IF NOT EXISTS order_discounts (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID          NOT NULL,
  order_item_id UUID          NULL,
  discount_id   UUID          NULL,                -- NULL jika diskon manual
  name          VARCHAR(100)  NOT NULL,            -- snapshot
  type          discount_type NOT NULL,
  value         DECIMAL(15,2) NOT NULL,
  amount        DECIMAL(15,2) NOT NULL,            -- nominal hasil hitung
  applied_stage applied_stage NOT NULL DEFAULT 'order',
  approved_by   UUID          NULL,
  applied_by    UUID          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_od_order    FOREIGN KEY (order_id)      REFERENCES orders(id)      ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_od_item     FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_od_discount FOREIGN KEY (discount_id)   REFERENCES discounts(id)   ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_od_approver FOREIGN KEY (approved_by)   REFERENCES users(id)       ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_od_user     FOREIGN KEY (applied_by)    REFERENCES users(id)       ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_od_order ON order_discounts(order_id);
CREATE INDEX idx_od_item ON order_discounts(order_item_id);
