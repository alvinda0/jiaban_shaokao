-- =====================================================================
-- POS RESTORAN - SKEMA TAMBAHAN (MySQL 8.0.13+)
-- Lanjutan dari tabel: roles, users, stores, tables
--
-- Urutan perhitungan (disimpan sebagai snapshot di orders):
--   1. subtotal        = SUM(order_items.line_total)  (harga + varian) x qty
--   2. discount_total  = diskon item + diskon order (order/payment stage)
--   3. taxable_base    = subtotal - discount_total
--   4. service_charge  = taxable_base x SC%        (SKIP jika take_away)
--   5. tax (PB1)       = (taxable_base + SC) x PB1%
--   6. grand_total     = taxable_base + SC + PB1 + rounding
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. User <-> Store (opsional, jika 1 user bisa akses beberapa outlet)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_stores (
  user_id    CHAR(36) NOT NULL,
  store_id   CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, store_id),
  CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_us_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 1. KATEGORI & SUB KATEGORI (self reference lewat parent_id)
--    Contoh: Makanan -> Nasi, Mie | Minuman -> Kopi, Jus
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id   CHAR(36)     NOT NULL,
  parent_id  CHAR(36)     NULL,
  name       VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_categories_store  (store_id),
  INDEX idx_categories_parent (parent_id),
  UNIQUE KEY uq_category_name (store_id, parent_id, name),

  CONSTRAINT fk_categories_store  FOREIGN KEY (store_id)  REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 2. MENU
--    track_stock = 1  -> stok dikurangi saat order & dicek sebelum order
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menus (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id    CHAR(36)      NOT NULL,
  category_id CHAR(36)      NOT NULL,   -- boleh kategori ATAU sub kategori
  sku         VARCHAR(50)   NULL,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  image_url   VARCHAR(255)  NULL,
  price       DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price  DECIMAL(15,2) NOT NULL DEFAULT 0,   -- HPP (opsional, untuk laporan)
  track_stock TINYINT(1)    NOT NULL DEFAULT 0,
  stock_qty   DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock   DECIMAL(12,3) NOT NULL DEFAULT 0,   -- batas peringatan stok menipis
  is_available TINYINT(1)   NOT NULL DEFAULT 1,   -- toggle "habis" manual
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_menus_store    (store_id),
  INDEX idx_menus_category (category_id),
  UNIQUE KEY uq_menu_sku (store_id, sku),

  CONSTRAINT fk_menus_store    FOREIGN KEY (store_id)    REFERENCES stores(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_menus_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 3. VARIAN MENU
--    Group  : "Level Pedas", "Ukuran", "Topping"
--    Option : "Tidak Pedas", "Pedas", "Extra Pedas (+2000)"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variant_groups (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  menu_id     CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_required TINYINT(1)   NOT NULL DEFAULT 0,
  min_select  INT          NOT NULL DEFAULT 0,
  max_select  INT          NOT NULL DEFAULT 1,   -- 1 = pilih satu, >1 = multi (topping)
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vg_menu (menu_id),
  CONSTRAINT fk_vg_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS variant_options (
  id               CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  variant_group_id CHAR(36)      NOT NULL,
  name             VARCHAR(100)  NOT NULL,
  price_adjustment DECIMAL(15,2) NOT NULL DEFAULT 0,   -- tambahan harga (boleh negatif)
  is_default       TINYINT(1)    NOT NULL DEFAULT 0,
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vo_group (variant_group_id),
  CONSTRAINT fk_vo_group FOREIGN KEY (variant_group_id) REFERENCES variant_groups(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 4. RIWAYAT STOK (ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id       CHAR(36)     NOT NULL,
  menu_id        CHAR(36)     NOT NULL,
  type           ENUM('purchase','sale','void_return','adjustment','waste','opname') NOT NULL,
  qty_change     DECIMAL(12,3) NOT NULL,          -- + masuk, - keluar
  qty_after      DECIMAL(12,3) NOT NULL,
  reference_type VARCHAR(30)  NULL,               -- mis: 'order_item'
  reference_id   CHAR(36)     NULL,
  notes          VARCHAR(255) NULL,
  created_by     CHAR(36)     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sm_menu_date (menu_id, created_at),
  INDEX idx_sm_store     (store_id),
  INDEX idx_sm_ref       (reference_type, reference_id),

  CONSTRAINT fk_sm_store FOREIGN KEY (store_id)   REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sm_menu  FOREIGN KEY (menu_id)    REFERENCES menus(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sm_user  FOREIGN KEY (created_by) REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 5. PAJAK (PB1 & Service Charge) - bisa diatur per store
--    apply_take_away = 0 pada SC  -> SC tidak berlaku untuk take away
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_rules (
  id                 CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id           CHAR(36)     NOT NULL,
  code               ENUM('PB1','SC') NOT NULL,
  name               VARCHAR(50)  NOT NULL,
  rate               DECIMAL(5,2) NOT NULL,                -- persen, mis 10.00
  apply_dine_in      TINYINT(1)   NOT NULL DEFAULT 1,
  apply_take_away    TINYINT(1)   NOT NULL DEFAULT 1,
  apply_delivery     TINYINT(1)   NOT NULL DEFAULT 1,
  include_sc_in_base TINYINT(1)   NOT NULL DEFAULT 0,      -- PB1: 1 = dihitung dari (subtotal + SC)
  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_tax_store_code (store_id, code),
  CONSTRAINT fk_tax_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6. MASTER DISKON (bisa dipilih di awal order atau saat pembayaran)
--    scope 'item'  -> potong per item menu
--    scope 'order' -> potong total order
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discounts (
  id                CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id          CHAR(36)      NOT NULL,
  name              VARCHAR(100)  NOT NULL,
  scope             ENUM('item','order') NOT NULL DEFAULT 'order',
  type              ENUM('percent','fixed') NOT NULL,
  value             DECIMAL(15,2) NOT NULL,
  max_discount      DECIMAL(15,2) NULL,        -- plafon untuk diskon persen
  min_order_amount  DECIMAL(15,2) NULL,
  allow_at_order    TINYINT(1)    NOT NULL DEFAULT 1,   -- boleh dipasang di awal order
  allow_at_payment  TINYINT(1)    NOT NULL DEFAULT 1,   -- boleh dipasang saat bayar
  requires_approval TINYINT(1)    NOT NULL DEFAULT 0,   -- perlu PIN admin
  start_at          DATETIME      NULL,
  end_at            DATETIME      NULL,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_discounts_store (store_id),
  CONSTRAINT fk_discounts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 7. METODE PEMBAYARAN
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_methods (
  id                 CHAR(36)     NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id           CHAR(36)     NOT NULL,
  code               VARCHAR(30)  NOT NULL,        -- cash, qris, debit, gopay, ovo ...
  name               VARCHAR(80)  NOT NULL,
  type               ENUM('cash','qris','debit','credit','ewallet','transfer','voucher','other') NOT NULL,
  requires_reference TINYINT(1)   NOT NULL DEFAULT 0,  -- wajib isi no. approval / ref
  fee_percent        DECIMAL(5,2) NOT NULL DEFAULT 0,  -- MDR (opsional, untuk laporan)
  sort_order         INT          NOT NULL DEFAULT 0,
  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_pm_store_code (store_id, code),
  CONSTRAINT fk_pm_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 8. ORDER
--    status: open -> paid | void | merged
--    merged_into_order_id terisi jika order ini digabung ke order lain
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                   CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  store_id             CHAR(36)      NOT NULL,
  table_id             CHAR(36)      NULL,           -- NULL untuk take away / delivery
  order_number         VARCHAR(30)   NOT NULL,       -- mis: INV-20261030-0001
  order_type           ENUM('dine_in','take_away','delivery') NOT NULL DEFAULT 'dine_in',
  source               ENUM('pos','qr') NOT NULL DEFAULT 'pos',
  status               ENUM('open','paid','void','merged') NOT NULL DEFAULT 'open',
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
  is_complimentary      TINYINT(1)    NOT NULL DEFAULT 0,  -- 1 = seluruh order gratis
  complimentary_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,  -- nilai yang digratiskan (laporan)
  complimentary_reason  VARCHAR(255)  NULL,
  complimentary_by      CHAR(36)      NULL,

  merged_into_order_id CHAR(36)      NULL,
  created_by           CHAR(36)      NULL,           -- captain
  opened_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at            DATETIME      NULL,
  voided_by            CHAR(36)      NULL,
  void_reason          VARCHAR(255)  NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_order_number (store_id, order_number),
  INDEX idx_orders_store_status (store_id, status),
  INDEX idx_orders_table        (table_id, status),
  INDEX idx_orders_opened_at    (store_id, opened_at),

  CONSTRAINT fk_orders_store  FOREIGN KEY (store_id)             REFERENCES stores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_table  FOREIGN KEY (table_id)             REFERENCES tables(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_merged FOREIGN KEY (merged_into_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_user   FOREIGN KEY (created_by)           REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_comp   FOREIGN KEY (complimentary_by)     REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_void   FOREIGN KEY (voided_by)            REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 9. ITEM ORDER
--    menu_name & unit_price = snapshot (aman jika menu diubah kemudian)
--    original_order_id      = asal item sebelum digabung
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                   CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id             CHAR(36)      NOT NULL,
  original_order_id    CHAR(36)      NULL,
  menu_id              CHAR(36)      NOT NULL,
  menu_name            VARCHAR(150)  NOT NULL,
  qty                  INT           NOT NULL DEFAULT 1,
  unit_price           DECIMAL(15,2) NOT NULL,          -- harga dasar menu
  variant_total        DECIMAL(15,2) NOT NULL DEFAULT 0, -- total tambahan varian per 1 qty
  discount_amount      DECIMAL(15,2) NOT NULL DEFAULT 0, -- total diskon untuk baris ini
  line_total           DECIMAL(15,2) NOT NULL DEFAULT 0, -- (unit_price+variant_total)*qty - discount
  notes                VARCHAR(255)  NULL,               -- "jangan pakai bawang"
  status               ENUM('pending','preparing','ready','served','void') NOT NULL DEFAULT 'pending',

  -- complement per item
  is_complimentary     TINYINT(1)    NOT NULL DEFAULT 0,
  complimentary_reason VARCHAR(255)  NULL,
  complimentary_by     CHAR(36)      NULL,

  voided_by            CHAR(36)      NULL,
  void_reason          VARCHAR(255)  NULL,
  sent_to_kitchen_at   DATETIME      NULL,
  created_by           CHAR(36)      NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_oi_order  (order_id),
  INDEX idx_oi_menu   (menu_id),
  INDEX idx_oi_status (status),

  CONSTRAINT fk_oi_order    FOREIGN KEY (order_id)          REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oi_original FOREIGN KEY (original_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_menu     FOREIGN KEY (menu_id)           REFERENCES menus(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_oi_comp     FOREIGN KEY (complimentary_by)  REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_void     FOREIGN KEY (voided_by)         REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_oi_user     FOREIGN KEY (created_by)        REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

-- varian yang dipilih per item (snapshot nama & harga)
CREATE TABLE IF NOT EXISTS order_item_variants (
  id                CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_item_id     CHAR(36)      NOT NULL,
  variant_option_id CHAR(36)      NULL,
  group_name        VARCHAR(100)  NOT NULL,
  option_name       VARCHAR(100)  NOT NULL,
  price_adjustment  DECIMAL(15,2) NOT NULL DEFAULT 0,

  INDEX idx_oiv_item (order_item_id),
  CONSTRAINT fk_oiv_item   FOREIGN KEY (order_item_id)     REFERENCES order_items(id)     ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_oiv_option FOREIGN KEY (variant_option_id) REFERENCES variant_options(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 10. DISKON YANG DIPAKAI
--     applied_stage : 'order'   = dimasukkan di awal / saat order
--                     'payment' = dimasukkan saat pembayaran
--     order_item_id NULL -> diskon level order, terisi -> diskon level item
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_discounts (
  id            CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id      CHAR(36)      NOT NULL,
  order_item_id CHAR(36)      NULL,
  discount_id   CHAR(36)      NULL,                -- NULL jika diskon manual
  name          VARCHAR(100)  NOT NULL,            -- snapshot
  type          ENUM('percent','fixed') NOT NULL,
  value         DECIMAL(15,2) NOT NULL,
  amount        DECIMAL(15,2) NOT NULL,            -- nominal hasil hitung
  applied_stage ENUM('order','payment') NOT NULL DEFAULT 'order',
  approved_by   CHAR(36)      NULL,
  applied_by    CHAR(36)      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_od_order (order_id),
  INDEX idx_od_item  (order_item_id),

  CONSTRAINT fk_od_order    FOREIGN KEY (order_id)      REFERENCES orders(id)      ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_od_item     FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_od_discount FOREIGN KEY (discount_id)   REFERENCES discounts(id)   ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_od_approver FOREIGN KEY (approved_by)   REFERENCES users(id)       ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_od_user     FOREIGN KEY (applied_by)    REFERENCES users(id)       ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 11. SNAPSHOT PAJAK PER ORDER (PB1 / SC)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_taxes (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id    CHAR(36)      NOT NULL,
  tax_rule_id CHAR(36)      NULL,
  code        ENUM('PB1','SC') NOT NULL,
  rate        DECIMAL(5,2)  NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_order_tax (order_id, code),
  CONSTRAINT fk_ot_order FOREIGN KEY (order_id)    REFERENCES orders(id)    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ot_rule  FOREIGN KEY (tax_rule_id) REFERENCES tax_rules(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 12. GABUNG ORDER (log)
--     Proses: pindahkan order_items source -> target, set source.status='merged'
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_merges (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  target_order_id CHAR(36) NOT NULL,
  source_order_id CHAR(36) NOT NULL,
  merged_by       CHAR(36) NULL,
  merged_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_om_target (target_order_id),
  INDEX idx_om_source (source_order_id),

  CONSTRAINT fk_om_target FOREIGN KEY (target_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_om_source FOREIGN KEY (source_order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_om_user   FOREIGN KEY (merged_by)       REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 13. SPLIT ORDER SAAT PEMBAYARAN (split per bill)
--     Satu order -> beberapa bill (Bill 1, Bill 2, ...)
--     Item bisa dibagi parsial (qty) lewat order_bill_items.
--     Split berdasarkan nominal / rata cukup pakai banyak baris di `payments`.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_bills (
  id                   CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id             CHAR(36)      NOT NULL,
  bill_number          INT           NOT NULL,          -- 1,2,3...
  label                VARCHAR(50)   NULL,              -- "Budi", "Meja sebelah"
  subtotal             DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_total       DECIMAL(15,2) NOT NULL DEFAULT 0,
  service_charge_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_total            DECIMAL(15,2) NOT NULL DEFAULT 0,
  rounding             DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_total           DECIMAL(15,2) NOT NULL DEFAULT 0,
  status               ENUM('unpaid','paid','void') NOT NULL DEFAULT 'unpaid',
  paid_at              DATETIME      NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_bill_number (order_id, bill_number),
  CONSTRAINT fk_ob_order FOREIGN KEY (order_id) REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_bill_items (
  id            CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  bill_id       CHAR(36)      NOT NULL,
  order_item_id CHAR(36)      NOT NULL,
  qty           INT           NOT NULL DEFAULT 1,       -- porsi yang masuk bill ini
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,       -- nilai bagian bill ini (setelah diskon)

  UNIQUE KEY uq_bill_item (bill_id, order_item_id),
  INDEX idx_obi_item (order_item_id),

  CONSTRAINT fk_obi_bill FOREIGN KEY (bill_id)       REFERENCES order_bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_obi_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 14. PEMBAYARAN (multi metode, multi baris per order/bill)
--     bill_id NULL -> bayar untuk order utuh (atau split nominal)
--     Contoh bayar campur: Cash 100.000 + QRIS 50.000 = 2 baris
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                CHAR(36)      NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id          CHAR(36)      NOT NULL,
  bill_id           CHAR(36)      NULL,
  payment_method_id CHAR(36)      NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,             -- nominal yang dihitung lunas
  tendered_amount   DECIMAL(15,2) NULL,                 -- uang diterima (cash)
  change_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,   -- kembalian
  reference_no      VARCHAR(100)  NULL,                 -- no. approval EDC / ref QRIS
  status            ENUM('paid','void','refunded') NOT NULL DEFAULT 'paid',
  paid_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by       CHAR(36)      NULL,                 -- kasir/captain
  voided_by         CHAR(36)      NULL,
  void_reason       VARCHAR(255)  NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_pay_order  (order_id),
  INDEX idx_pay_bill   (bill_id),
  INDEX idx_pay_method (payment_method_id),
  INDEX idx_pay_paid   (paid_at),

  CONSTRAINT fk_pay_order  FOREIGN KEY (order_id)          REFERENCES orders(id)          ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_bill   FOREIGN KEY (bill_id)           REFERENCES order_bills(id)     ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pay_user   FOREIGN KEY (received_by)       REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pay_void   FOREIGN KEY (voided_by)         REFERENCES users(id)           ON UPDATE CASCADE ON DELETE SET NULL
);

-- =====================================================================
-- SEED DEFAULT (dijalankan untuk semua store yang sudah ada)
-- =====================================================================

-- Pajak: PB1 10% (semua tipe), SC 5% (TIDAK berlaku untuk take away)
INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'PB1', 'Pajak Restoran (PB1)', 10.00, 1, 1, 1, 1 FROM stores
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'SC', 'Service Charge', 5.00, 1, 0, 0, 0 FROM stores
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Metode pembayaran
INSERT INTO payment_methods (store_id, code, name, type, requires_reference, sort_order)
SELECT s.id, p.code, p.name, p.type, p.req, p.sort
FROM stores s
CROSS JOIN (
  SELECT 'cash'  AS code, 'Cash'  AS name, 'cash'    AS type, 0 AS req, 1 AS sort UNION ALL
  SELECT 'qris',  'QRIS',   'qris',    1, 2 UNION ALL
  SELECT 'debit', 'Debit',  'debit',   1, 3 UNION ALL
  SELECT 'credit','Kartu Kredit','credit', 1, 4 UNION ALL
  SELECT 'gopay', 'GoPay',  'ewallet', 1, 5 UNION ALL
  SELECT 'ovo',   'OVO',    'ewallet', 1, 6 UNION ALL
  SELECT 'dana',  'DANA',   'ewallet', 1, 7 UNION ALL
  SELECT 'shopeepay', 'ShopeePay', 'ewallet', 1, 8 UNION ALL
  SELECT 'transfer',  'Transfer Bank', 'transfer', 1, 9
) p
ON DUPLICATE KEY UPDATE name = VALUES(name);
