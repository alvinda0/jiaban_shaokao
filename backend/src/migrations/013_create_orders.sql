-- ORDER
-- status: open -> paid | void | merged
-- merged_into_order_id terisi jika order ini digabung ke order lain
CREATE TYPE order_type AS ENUM ('dine_in','take_away','delivery');
CREATE TYPE order_source AS ENUM ('pos','qr');
CREATE TYPE order_status AS ENUM ('open','paid','void','merged');

CREATE TABLE IF NOT EXISTS orders (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id             UUID          NOT NULL,
  table_id             UUID          NULL,           -- NULL untuk take away / delivery
  order_number         VARCHAR(30)   NOT NULL,       -- mis: INV-20261030-0001
  order_type           order_type    NOT NULL DEFAULT 'dine_in',
  source               order_source  NOT NULL DEFAULT 'pos',
  status               order_status  NOT NULL DEFAULT 'open',
  customer_name        VARCHAR(100)  NULL,
  guest_count          INT           NULL,
  notes                VARCHAR(255)  NULL,

  -- snapshot nominal
  subtotal             DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
  service_charge_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_total            DECIMAL(15,2) NOT NULL DEFAULT 0,   -- PB1
  rounding             DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_total           DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- complement (gratis)
  is_complimentary      BOOLEAN       NOT NULL DEFAULT false,  -- true = seluruh order gratis
  complimentary_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,  -- nilai yang digratiskan (laporan)
  complimentary_reason  VARCHAR(255)  NULL,
  complimentary_by      UUID          NULL,

  merged_into_order_id UUID          NULL,
  created_by           UUID          NULL,           -- captain
  opened_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at            TIMESTAMP     NULL,
  voided_by            UUID          NULL,
  void_reason          VARCHAR(255)  NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_order_number UNIQUE (store_id, order_number),
  CONSTRAINT fk_orders_store  FOREIGN KEY (store_id)             REFERENCES stores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_table  FOREIGN KEY (table_id)             REFERENCES tables(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_merged FOREIGN KEY (merged_into_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_user   FOREIGN KEY (created_by)           REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_comp   FOREIGN KEY (complimentary_by)     REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_void   FOREIGN KEY (voided_by)            REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_orders_opened_at ON orders(store_id, opened_at);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
