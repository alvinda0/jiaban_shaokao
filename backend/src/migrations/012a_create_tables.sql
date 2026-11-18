CREATE TYPE table_type AS ENUM ('reguler','lantai2','takeaway','vvip');

CREATE TABLE IF NOT EXISTS tables (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id   UUID         NOT NULL,
  number     VARCHAR(20)  NOT NULL,
  type       table_type   NOT NULL DEFAULT 'reguler',
  qr_token   CHAR(64)     NOT NULL UNIQUE,
  qr_url     VARCHAR(500) NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_table_store_number UNIQUE (store_id, number),
  CONSTRAINT fk_tables_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_tables_qr_token ON tables(qr_token);

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
