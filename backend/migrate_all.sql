CREATE TABLE IF NOT EXISTS roles (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed roles
INSERT INTO roles (name) VALUES
  ('superuser'),
  ('admin'),
  ('captain'),
  ('kitchen')
ON CONFLICT (name) DO NOTHING;
CREATE TABLE IF NOT EXISTS users (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id    UUID         NOT NULL,
  store_id   UUID         NULL,        -- NULL untuk superuser (bisa akses semua store)
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_store_id ON users(store_id);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to stores after stores table is created (will be added in 004)
-- ALTER TABLE users ADD CONSTRAINT fk_users_store
--   FOREIGN KEY (store_id) REFERENCES stores(id)
--   ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE TABLE IF NOT EXISTS stores (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  phone      VARCHAR(20),
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add foreign key constraint from users to stores
-- This is done after stores table is created

ALTER TABLE users ADD CONSTRAINT fk_users_store
  FOREIGN KEY (store_id) REFERENCES stores(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
CREATE TABLE IF NOT EXISTS store_users (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  role_id    CHAR(36)     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_store_user (store_id, user_id),

  CONSTRAINT fk_store_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_store_users_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_store_users_role  FOREIGN KEY (role_id)  REFERENCES roles(id)  ON UPDATE CASCADE ON DELETE RESTRICT
);
-- User <-> Store (opsional, jika 1 user bisa akses beberapa outlet)
CREATE TABLE IF NOT EXISTS user_stores (
  user_id    CHAR(36) NOT NULL,
  store_id   CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, store_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_us_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
-- KATEGORI & SUB KATEGORI (self reference lewat parent_id)
-- Contoh: Makanan -> Nasi, Mie | Minuman -> Kopi, Jus
CREATE TABLE IF NOT EXISTS categories (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id   UUID         NOT NULL,
  parent_id  UUID         NULL,
  name       VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_category_name UNIQUE (store_id, parent_id, name),
  CONSTRAINT fk_categories_store  FOREIGN KEY (store_id)  REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- PRODUCT (Menu Item)
-- track_stock = true  -> stok dikurangi saat order & dicek sebelum order
CREATE TABLE IF NOT EXISTS products (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID          NOT NULL,
  category_id UUID          NOT NULL,   -- boleh kategori ATAU sub kategori
  sku         VARCHAR(50)   NULL,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  image_url   VARCHAR(255)  NULL,
  price       DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price  DECIMAL(15,2) NOT NULL DEFAULT 0,   -- HPP (opsional, untuk laporan)
  track_stock BOOLEAN       NOT NULL DEFAULT false,
  stock_qty   DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock   DECIMAL(12,3) NOT NULL DEFAULT 0,   -- batas peringatan stok menipis
  is_available BOOLEAN      NOT NULL DEFAULT true,   -- toggle "habis" manual
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_product_sku UNIQUE (store_id, sku),
  CONSTRAINT fk_products_store    FOREIGN KEY (store_id)    REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE IF NOT EXISTS product_variants (
  id         CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  product_id CHAR(36)       NOT NULL,
  name       VARCHAR(100)   NOT NULL,
  price      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active  TINYINT(1)     NOT NULL DEFAULT 1,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_variants_product (product_id),

  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
);
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
CREATE TABLE IF NOT EXISTS stock (
  id         CHAR(36)   NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)   NOT NULL,
  variant_id CHAR(36)   NOT NULL,
  qty        INT        NOT NULL DEFAULT 0,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_stock_store_variant (store_id, variant_id),

  CONSTRAINT fk_stock_store   FOREIGN KEY (store_id)   REFERENCES stores(id)           ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_stock_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE CASCADE
);
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
-- RIWAYAT STOK (ledger)
CREATE TYPE stock_movement_type AS ENUM ('purchase','sale','void_return','adjustment','waste','opname');

CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID                  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id       UUID                  NOT NULL,
  product_id     UUID                  NOT NULL,
  type           stock_movement_type   NOT NULL,
  qty_change     DECIMAL(12,3)         NOT NULL,          -- + masuk, - keluar
  qty_after      DECIMAL(12,3)         NOT NULL,
  reference_type VARCHAR(30)           NULL,               -- mis: 'order_item'
  reference_id   UUID                  NULL,
  notes          VARCHAR(255)          NULL,
  created_by     UUID                  NULL,
  created_at     TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_sm_store   FOREIGN KEY (store_id)   REFERENCES stores(id)   ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sm_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sm_user    FOREIGN KEY (created_by) REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_sm_product_date ON stock_movements(product_id, created_at);
CREATE INDEX idx_sm_store ON stock_movements(store_id);
CREATE INDEX idx_sm_ref ON stock_movements(reference_type, reference_id);
CREATE TABLE IF NOT EXISTS customers (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  UNIQUE,
  email      VARCHAR(150) UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- PAJAK (PB1 & Service Charge) - bisa diatur per store
-- apply_take_away = false pada SC  -> SC tidak berlaku untuk take away
CREATE TYPE tax_code AS ENUM ('PB1','SC');

CREATE TABLE IF NOT EXISTS tax_rules (
  id                 UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id           UUID         NOT NULL,
  code               tax_code     NOT NULL,
  name               VARCHAR(50)  NOT NULL,
  rate               DECIMAL(5,2) NOT NULL,                -- persen, mis 10.00
  apply_dine_in      BOOLEAN      NOT NULL DEFAULT true,
  apply_take_away    BOOLEAN      NOT NULL DEFAULT true,
  apply_delivery     BOOLEAN      NOT NULL DEFAULT true,
  include_sc_in_base BOOLEAN      NOT NULL DEFAULT false,      -- PB1: true = dihitung dari (subtotal + SC)
  is_active          BOOLEAN      NOT NULL DEFAULT true,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_tax_store_code UNIQUE (store_id, code),
  CONSTRAINT fk_tax_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON tax_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- MASTER DISKON (bisa dipilih di awal order atau saat pembayaran)
-- scope 'item'  -> potong per item menu
-- scope 'order' -> potong total order
CREATE TYPE discount_scope AS ENUM ('item','order');
CREATE TYPE discount_type AS ENUM ('percent','fixed');

CREATE TABLE IF NOT EXISTS discounts (
  id                UUID            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          UUID            NOT NULL,
  name              VARCHAR(100)    NOT NULL,
  scope             discount_scope  NOT NULL DEFAULT 'order',
  type              discount_type   NOT NULL,
  value             DECIMAL(15,2)   NOT NULL,
  max_discount      DECIMAL(15,2)   NULL,        -- plafon untuk diskon persen
  min_order_amount  DECIMAL(15,2)   NULL,
  allow_at_order    BOOLEAN         NOT NULL DEFAULT true,   -- boleh dipasang di awal order
  allow_at_payment  BOOLEAN         NOT NULL DEFAULT true,   -- boleh dipasang saat bayar
  requires_approval BOOLEAN         NOT NULL DEFAULT false,   -- perlu PIN admin
  start_at          TIMESTAMP       NULL,
  end_at            TIMESTAMP       NULL,
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_discounts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_discounts_store ON discounts(store_id);

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE IF NOT EXISTS orders (
  id              CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id        CHAR(36)       NOT NULL,
  cashier_id      CHAR(36)       NOT NULL,
  customer_id     CHAR(36),
  invoice_number  VARCHAR(50)    NOT NULL UNIQUE,
  total_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status          ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  note            TEXT,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_orders_store      (store_id),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_status     (status),

  CONSTRAINT fk_orders_store    FOREIGN KEY (store_id)    REFERENCES stores(id)    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_cashier  FOREIGN KEY (cashier_id)  REFERENCES users(id)     ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id     CHAR(36)       NOT NULL,
  variant_id   CHAR(36)       NOT NULL,
  name         VARCHAR(150)   NOT NULL,
  variant_name VARCHAR(100)   NOT NULL,
  price        DECIMAL(12, 2) NOT NULL,
  qty          INT            NOT NULL,
  subtotal     DECIMAL(12, 2) NOT NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_oi_order (order_id),

  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)           ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT
);
-- METODE PEMBAYARAN
CREATE TYPE payment_method_type AS ENUM ('cash','qris','debit','credit','ewallet','transfer','voucher','other');

CREATE TABLE IF NOT EXISTS payment_methods (
  id                 UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id           UUID                 NOT NULL,
  code               VARCHAR(30)          NOT NULL,        -- cash, qris, debit, gopay, ovo ...
  name               VARCHAR(80)          NOT NULL,
  type               payment_method_type  NOT NULL,
  requires_reference BOOLEAN              NOT NULL DEFAULT false,  -- wajib isi no. approval / ref
  fee_percent        DECIMAL(5,2)         NOT NULL DEFAULT 0,  -- MDR (opsional, untuk laporan)
  sort_order         INT                  NOT NULL DEFAULT 0,
  is_active          BOOLEAN              NOT NULL DEFAULT true,
  created_at         TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_pm_store_code UNIQUE (store_id, code),
  CONSTRAINT fk_pm_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
CREATE TABLE IF NOT EXISTS payments (
  id            CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id      CHAR(36)       NOT NULL,
  method        ENUM('cash', 'transfer', 'qris', 'card') NOT NULL,
  amount        DECIMAL(12, 2) NOT NULL,
  change_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_payments_order (order_id),

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE
);
-- ITEM ORDER
-- product_name & unit_price = snapshot (aman jika produk diubah kemudian)
-- original_order_id          = asal item sebelum digabung
CREATE TYPE order_item_status AS ENUM ('pending','preparing','ready','served','void');

CREATE TABLE IF NOT EXISTS order_items (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id             UUID          NOT NULL,
  original_order_id    UUID          NULL,
  product_id           UUID          NOT NULL,
  product_name         VARCHAR(150)  NOT NULL,
  qty                  INT           NOT NULL DEFAULT 1,
  unit_price           DECIMAL(15,2) NOT NULL,          -- harga dasar produk
  variant_total        DECIMAL(15,2) NOT NULL DEFAULT 0, -- total tambahan varian per 1 qty
  discount_amount      DECIMAL(15,2) NOT NULL DEFAULT 0, -- total diskon untuk baris ini
  line_total           DECIMAL(15,2) NOT NULL DEFAULT 0, -- (unit_price+variant_total)*qty - discount
  notes                VARCHAR(255)  NULL,               -- "jangan pakai bawang"
  status               order_item_status NOT NULL DEFAULT 'pending',

  -- complement per item
  is_complimentary     BOOLEAN       NOT NULL DEFAULT false,
  complimentary_reason VARCHAR(255)  NULL,
  complimentary_by     UUID          NULL,

  voided_by            UUID          NULL,
  void_reason          VARCHAR(255)  NULL,
  sent_to_kitchen_at   TIMESTAMP     NULL,
  created_by           UUID          NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_oi_order    FOREIGN KEY (order_id)          REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_original FOREIGN KEY (original_order_id) REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_product  FOREIGN KEY (product_id)        REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_oi_comp     FOREIGN KEY (complimentary_by)  REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_void     FOREIGN KEY (voided_by)         REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_user     FOREIGN KEY (created_by)        REFERENCES users(id)    ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_oi_order ON order_items(order_id);
CREATE INDEX idx_oi_product ON order_items(product_id);
CREATE INDEX idx_oi_status ON order_items(status);

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE IF NOT EXISTS tables (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)    NOT NULL,
  number     VARCHAR(20) NOT NULL,
  qr_token   CHAR(64)    NOT NULL UNIQUE,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tables_qr_token (qr_token),
  UNIQUE KEY uq_table_store_number (store_id, number),

  CONSTRAINT fk_tables_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
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
CREATE TABLE IF NOT EXISTS vouchers (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id     CHAR(36)       NOT NULL,
  code         VARCHAR(50)    NOT NULL,
  name         VARCHAR(100)   NOT NULL,
  description  TEXT,
  type         ENUM('percentage', 'fixed') NOT NULL,
  value        DECIMAL(12, 2) NOT NULL,
  min_order    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12, 2),
  quota        INT,
  used_count   INT            NOT NULL DEFAULT 0,
  is_active    TINYINT(1)     NOT NULL DEFAULT 1,
  started_at   DATETIME       NOT NULL,
  expired_at   DATETIME       NOT NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vouchers_code       (code),
  INDEX idx_vouchers_expired_at (expired_at),
  UNIQUE KEY uq_voucher_store_code (store_id, code),

  CONSTRAINT fk_vouchers_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);
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
CREATE TABLE IF NOT EXISTS voucher_usage (
  id         CHAR(36)       NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  voucher_id CHAR(36)       NOT NULL,
  order_id   CHAR(36)       NOT NULL UNIQUE,
  discount   DECIMAL(12, 2) NOT NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vu_voucher (voucher_id),

  CONSTRAINT fk_vu_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vu_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON UPDATE CASCADE ON DELETE CASCADE
);
-- Add table_id if not exists
SET @col_table = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'table_id'
);
SET @sql_table = IF(@col_table = 0,
  'ALTER TABLE orders ADD COLUMN table_id CHAR(36) AFTER store_id, ADD CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON UPDATE CASCADE ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add voucher_id if not exists
SET @col_voucher = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'voucher_id'
);
SET @sql_voucher = IF(@col_voucher = 0,
  'ALTER TABLE orders ADD COLUMN voucher_id CHAR(36) AFTER customer_id, ADD CONSTRAINT fk_orders_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_voucher;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
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
SET @col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND COLUMN_NAME = 'logo'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE stores ADD COLUMN logo VARCHAR(255) AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
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
SET @col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tables' AND COLUMN_NAME = 'type'
);
SET @sql = IF(@col = 0,
  "ALTER TABLE tables ADD COLUMN type ENUM('regular','takeaway','floor2','vvip') NOT NULL DEFAULT 'regular' AFTER number",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- SPLIT ORDER SAAT PEMBAYARAN (split per bill)
-- Satu order -> beberapa bill (Bill 1, Bill 2, ...)
-- Item bisa dibagi parsial (qty) lewat order_bill_items.
-- Split berdasarkan nominal / rata cukup pakai banyak baris di `payments`.
CREATE TYPE bill_status AS ENUM ('unpaid','paid','void');

CREATE TABLE IF NOT EXISTS order_bills (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id             UUID          NOT NULL,
  bill_number          INT           NOT NULL,          -- 1,2,3...
  label                VARCHAR(50)   NULL,              -- "Budi", "Meja sebelah"
  subtotal             DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
  service_charge_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_total            DECIMAL(15,2) NOT NULL DEFAULT 0,
  rounding             DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_total           DECIMAL(15,2) NOT NULL DEFAULT 0,
  status               bill_status   NOT NULL DEFAULT 'unpaid',
  paid_at              TIMESTAMP     NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_bill_number UNIQUE (order_id, bill_number),
  CONSTRAINT fk_ob_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER update_order_bills_updated_at BEFORE UPDATE ON order_bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
SET @col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tables' AND COLUMN_NAME = 'qr_url'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE tables ADD COLUMN qr_url VARCHAR(500) AFTER qr_token',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ORDER BILL ITEMS
-- Item yang masuk ke dalam bill tertentu saat split pembayaran
CREATE TABLE IF NOT EXISTS order_bill_items (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id       UUID          NOT NULL,
  order_item_id UUID          NOT NULL,
  qty           INT           NOT NULL DEFAULT 1,       -- porsi yang masuk bill ini
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,       -- nilai bagian bill ini (setelah diskon)

  CONSTRAINT uq_bill_item UNIQUE (bill_id, order_item_id),
  CONSTRAINT fk_obi_bill FOREIGN KEY (bill_id)       REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_obi_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_obi_item ON order_bill_items(order_item_id);
-- PEMBAYARAN (multi metode, multi baris per order/bill)
-- bill_id NULL -> bayar untuk order utuh (atau split nominal)
-- Contoh bayar campur: Cash 100.000 + QRIS 50.000 = 2 baris
CREATE TYPE payment_status AS ENUM ('paid','void','refunded');

CREATE TABLE IF NOT EXISTS payments (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          UUID          NOT NULL,
  bill_id           UUID          NULL,
  payment_method_id UUID          NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,             -- nominal yang dihitung lunas
  tendered_amount   DECIMAL(15,2) NULL,                 -- uang diterima (cash)
  change_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,   -- kembalian
  reference_no      VARCHAR(100)  NULL,                 -- no. approval EDC / ref QRIS
  status            payment_status NOT NULL DEFAULT 'paid',
  paid_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by       UUID          NULL,                 -- kasir/captain
  voided_by         UUID          NULL,
  void_reason       VARCHAR(255)  NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pay_order  FOREIGN KEY (order_id)          REFERENCES orders(id)          ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_bill   FOREIGN KEY (bill_id)           REFERENCES order_bills(id)     ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_user   FOREIGN KEY (received_by)       REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_void   FOREIGN KEY (voided_by)         REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_pay_order ON payments(order_id);
CREATE INDEX idx_pay_bill ON payments(bill_id);
CREATE INDEX idx_pay_method ON payments(payment_method_id);
CREATE INDEX idx_pay_paid ON payments(paid_at);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- SEED DEFAULT TAX RULES
-- Pajak: PB1 10% (semua tipe), SC 5% (TIDAK berlaku untuk take away)

INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'PB1', 'Pajak Restoran (PB1)', 10.00, true, true, true, true FROM stores
ON CONFLICT DO NOTHING;

INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'SC', 'Service Charge', 5.00, true, false, false, false FROM stores
ON CONFLICT DO NOTHING;
-- SEED DEFAULT PAYMENT METHODS
-- Metode pembayaran standar untuk semua store

INSERT INTO payment_methods (store_id, code, name, type, requires_reference, sort_order)
SELECT s.id, p.code, p.name, p.type::payment_method_type, p.req, p.sort
FROM stores s
CROSS JOIN (
  SELECT 'cash' AS code, 'Cash' AS name, 'cash' AS type, false AS req, 1 AS sort UNION ALL
  SELECT 'qris', 'QRIS', 'qris', true, 2 UNION ALL
  SELECT 'debit', 'Debit', 'debit', true, 3 UNION ALL
  SELECT 'credit', 'Kartu Kredit', 'credit', true, 4 UNION ALL
  SELECT 'gopay', 'GoPay', 'ewallet', true, 5 UNION ALL
  SELECT 'ovo', 'OVO', 'ewallet', true, 6 UNION ALL
  SELECT 'dana', 'DANA', 'ewallet', true, 7 UNION ALL
  SELECT 'shopeepay', 'ShopeePay', 'ewallet', true, 8 UNION ALL
  SELECT 'transfer', 'Transfer Bank', 'transfer', true, 9
) p
ON CONFLICT DO NOTHING;
-- Add qr_url column to tables (already exists in 024, so this can be skipped if running fresh)
-- This file is kept for backward compatibility with existing databases
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tables' AND column_name='qr_url') THEN
    ALTER TABLE tables ADD COLUMN qr_url VARCHAR(500) NULL;
  END IF;
END $$;
-- Add logo_url column to stores
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='stores' AND column_name='logo_url') THEN
    ALTER TABLE stores ADD COLUMN logo_url TEXT NULL;
  END IF;
END $$;
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
-- Add customer_phone column to orders table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='customer_phone') THEN
    ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(20) NULL;
  END IF;
END $$;
-- Add accepted_at field to orders table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='accepted_at') THEN
    ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMP NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='accepted_by') THEN
    ALTER TABLE orders ADD COLUMN accepted_by UUID NULL;
    ALTER TABLE orders ADD CONSTRAINT fk_orders_accepted 
      FOREIGN KEY (accepted_by) REFERENCES users(id) 
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for accepted orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_accepted') THEN
    CREATE INDEX idx_orders_accepted ON orders(store_id, accepted_at);
  END IF;
END $$;
-- Alter order_status enum
-- From: 'open','paid','void','merged'
-- To: 'pending','processing','paid','void','merged'

-- Step 1: Drop default constraint
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create new enum type
DROP TYPE IF EXISTS order_status_new CASCADE;
CREATE TYPE order_status_new AS ENUM ('pending','processing','paid','void','merged');

-- Step 3: Alter the table to use the new type
ALTER TABLE orders 
  ALTER COLUMN status TYPE order_status_new 
  USING (
    CASE status::text
      WHEN 'open' THEN 'pending'::order_status_new
      ELSE status::text::order_status_new
    END
  );

-- Step 4: Drop old type and rename new type
DROP TYPE IF EXISTS order_status CASCADE;
ALTER TYPE order_status_new RENAME TO order_status;

-- Step 5: Restore default value
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
-- Alter order_item_status enum
-- From: 'pending','preparing','ready','served','void'
-- To: 'pending','processing','ready','void'

-- Step 1: Drop default constraint
ALTER TABLE order_items ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create new enum type
DROP TYPE IF EXISTS order_item_status_new CASCADE;
CREATE TYPE order_item_status_new AS ENUM ('pending','processing','ready','void');

-- Step 3: Alter the table to use the new type
ALTER TABLE order_items 
  ALTER COLUMN status TYPE order_item_status_new 
  USING (
    CASE status::text
      WHEN 'preparing' THEN 'processing'::order_item_status_new
      WHEN 'served' THEN 'ready'::order_item_status_new
      ELSE status::text::order_item_status_new
    END
  );

-- Step 4: Drop old type and rename new type
DROP TYPE IF EXISTS order_item_status CASCADE;
ALTER TYPE order_item_status_new RENAME TO order_item_status;

-- Step 5: Restore default value
ALTER TABLE order_items ALTER COLUMN status SET DEFAULT 'pending'::order_item_status;
-- Add merged_from_order_number column to order_items table
ALTER TABLE order_items 
ADD COLUMN merged_from_order_number VARCHAR(50) NULL;

-- Add index for faster queries
CREATE INDEX idx_order_items_merged_from ON order_items(merged_from_order_number) WHERE merged_from_order_number IS NOT NULL;

COMMENT ON COLUMN order_items.merged_from_order_number IS 'Order number of the source order when this item was moved via merge';
-- Add split_from_order_id to track which order this bill was split from
ALTER TABLE order_bills 
ADD COLUMN IF NOT EXISTS split_from_order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL;

-- Add split_method to track how the bill was created
ALTER TABLE order_bills
ADD COLUMN IF NOT EXISTS split_method VARCHAR(20) NULL CHECK (split_method IN ('item', 'amount', 'manual'));

COMMENT ON COLUMN order_bills.split_from_order_id IS 'Original order ID if this bill was created via split';
COMMENT ON COLUMN order_bills.split_method IS 'Method used to split: item, amount, or manual';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_bills_split_from ON order_bills(split_from_order_id) WHERE split_from_order_id IS NOT NULL;
-- Create bill_items table to track which items belong to which bill
-- This is needed when splitting by item
CREATE TABLE IF NOT EXISTS bill_items (
  id                UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id           UUID          NOT NULL,
  order_item_id     UUID          NOT NULL,
  quantity          INT           NOT NULL DEFAULT 1,
  unit_price        DECIMAL(15,2) NOT NULL,
  line_total        DECIMAL(15,2) NOT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_bi_bill FOREIGN KEY (bill_id) REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_bi_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_order_item_id ON bill_items(order_item_id);
-- Add is_split flag to orders table to quickly identify split orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_split BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for filtering split orders
CREATE INDEX IF NOT EXISTS idx_orders_is_split ON orders(is_split);

-- Update existing orders that have bills
UPDATE orders 
SET is_split = TRUE 
WHERE id IN (
  SELECT DISTINCT order_id 
  FROM order_bills 
  WHERE split_from_order_id IS NOT NULL
);
