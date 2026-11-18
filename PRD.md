# Product Requirements Document (PRD)
# Aplikasi POS Restoran - Shaokao

## 1. Executive Summary

### 1.1 Overview
Shaokao POS adalah aplikasi Point of Sale untuk restoran yang dirancang untuk mengelola operasional restoran dari multi-store, manajemen menu, order, pembayaran, hingga laporan penjualan dengan fitur lengkap seperti split bill, order merge, dan sistem pajak yang fleksibel.

### 1.2 Objectives
- Mempermudah proses pemesanan dan pembayaran di restoran
- Mengelola multiple outlet/store dari satu sistem
- Tracking stok real-time dengan alert stok menipis
- Sistem perpajakan yang sesuai dengan regulasi (PB1 & Service Charge)
- Fleksibilitas diskon dan promosi
- Laporan penjualan yang detail dan akurat

### 1.3 Target Users
- **Superuser**: Owner/CEO yang mengelola semua store
- **Admin Store**: Manager yang mengelola satu outlet
- **Captain/Kasir**: Staff yang melayani customer dan pemesanan
- **Kitchen**: Chef yang menerima order dari captain

---

## 2. System Architecture

### 2.1 Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MariaDB/MySQL 8.0+
- **Frontend**: React + TypeScript + Vite
- **Authentication**: JWT (JSON Web Token)

### 2.2 Architecture Pattern
```
Model → Service → Controller → Route
```

---

## 3. Core Features

### 3.1 Multi-Store Management

#### 3.1.1 Store/Outlet
**Features:**
- Kelola multiple outlet/cabang restoran
- Setiap store punya data: nama, alamat, telepon, status aktif
- Setiap store punya tax rules, payment methods, dan menu sendiri

**User Stories:**
- Sebagai Superuser, saya ingin membuat store baru
- Sebagai Superuser, saya ingin melihat semua store
- Sebagai Superuser, saya ingin menonaktifkan store tertentu
- Sebagai Admin, saya ingin melihat detail store saya

**Database:**
- Table: `stores`
  - id, name, address, phone, is_active, created_at, updated_at

---

### 3.2 User Management

#### 3.2.1 Roles & Permissions

**Roles:**
1. **Superuser** (Owner)
   - Akses semua store
   - Buat/edit/hapus store
   - Buat/edit/hapus user
   - Lihat semua laporan

2. **Admin** (Manager Store)
   - Akses satu store spesifik
   - Kelola menu & produk store
   - Kelola staff store (captain, kitchen)
   - Kelola diskon & promosi
   - Lihat laporan store

3. **Captain** (Kasir)
   - Akses satu store spesifik
   - Buat order baru
   - Edit order (sebelum payment)
   - Proses pembayaran
   - Void order (dengan approval)
   - Merge order antar meja
   - Split bill
   - Apply diskon (dengan approval jika perlu)
   - Complement item/order

4. **Kitchen** (Chef)
   - Akses satu store spesifik
   - Lihat order masuk
   - Update status order item (preparing → ready)
   - Tidak bisa akses pembayaran

**User Stories:**
- Sebagai Superuser, saya ingin membuat user baru dengan role tertentu
- Sebagai Admin, saya ingin menambah captain baru di store saya
- Sebagai Captain, saya ingin login dan melihat meja-meja saya
- Sebagai Kitchen, saya ingin melihat order yang harus dimasak

**Database:**
- Table: `roles` (superuser, admin, captain, kitchen)
- Table: `users` (id, name, email, password, role_id, store_id, is_active)

---

### 3.3 Product & Menu Management

#### 3.3.1 Category & Sub-Category

**Features:**
- Kategori bisa punya sub-kategori (self-reference)
- Contoh: 
  - Makanan → Nasi, Mie, Pasta
  - Minuman → Kopi, Jus, Soft Drink
- Sort order untuk pengurutan tampilan

**User Stories:**
- Sebagai Admin, saya ingin membuat kategori "Makanan"
- Sebagai Admin, saya ingin membuat sub-kategori "Nasi Goreng" di bawah "Makanan"
- Sebagai Admin, saya ingin mengatur urutan kategori

**Database:**
- Table: `categories`
  - id, store_id, parent_id (NULL = kategori utama), name, sort_order, is_active

#### 3.3.2 Products (Menu Items)

**Features:**
- Nama produk, deskripsi, gambar, harga
- SKU (Stock Keeping Unit) - opsional, unik per store
- Harga pokok (cost_price) untuk laporan profit
- Track stock: ON/OFF
  - Jika ON: stok dikurangi otomatis saat order, ada alert stok menipis
  - Jika OFF: tidak ada tracking stok
- Status: is_available (habis/tersedia manual), is_active (aktif/nonaktif)
- Sort order untuk pengurutan tampilan

**User Stories:**
- Sebagai Admin, saya ingin menambah produk "Nasi Goreng Spesial" dengan harga 35000
- Sebagai Admin, saya ingin mengaktifkan tracking stok untuk "Nasi Goreng"
- Sebagai Admin, saya ingin menandai "Kopi Susu" sebagai habis sementara
- Sebagai Captain, saya ingin melihat produk yang tersedia untuk di-order

**Database:**
- Table: `products`
  - id, store_id, category_id, sku, name, description, image_url
  - price, cost_price, track_stock, stock_qty, min_stock
  - is_available, is_active, sort_order

#### 3.3.3 Product Variants

**Features:**
- Variant Group: Level Pedas, Ukuran, Topping, dll
- Variant Options: Tidak Pedas, Pedas, Extra Pedas (+2000)
- Price adjustment (+ atau -)
- Min/max selection per group
- Required/Optional

**Contoh:**
```
Nasi Goreng Spesial (35.000)
├── Level Pedas (Required, pilih 1)
│   ├── Tidak Pedas (Rp 0)
│   ├── Pedas (Rp 0)
│   └── Extra Pedas (+Rp 2.000)
├── Ukuran (Required, pilih 1)
│   ├── Regular (Rp 0)
│   └── Jumbo (+Rp 10.000)
└── Topping (Optional, pilih max 3)
    ├── Telur (+Rp 5.000)
    ├── Ayam (+Rp 8.000)
    └── Seafood (+Rp 12.000)
```

**User Stories:**
- Sebagai Admin, saya ingin menambahkan variant group "Level Pedas" untuk "Nasi Goreng"
- Sebagai Admin, saya ingin menambahkan option "Extra Pedas" dengan tambahan harga 2000
- Sebagai Captain, saya ingin memilih variant saat membuat order

**Database:**
- Table: `variant_groups`
  - id, product_id, name, is_required, min_select, max_select, sort_order
- Table: `variant_options`
  - id, variant_group_id, name, price_adjustment, is_default, is_active, sort_order

---

### 3.4 Stock Management

#### 3.4.1 Stock Tracking

**Features:**
- Real-time stock update saat order dibuat
- Stock movement history (ledger)
- Alert stok menipis (min_stock)
- Manual stock adjustment
- Stock opname

**Movement Types:**
- **purchase**: Pembelian stok baru
- **sale**: Penjualan (otomatis dari order)
- **void_return**: Pembatalan order (return stok)
- **adjustment**: Penyesuaian manual (koreksi stok)
- **waste**: Buang/rusak
- **opname**: Stock opname/audit

**User Stories:**
- Sebagai Admin, saya ingin menambah stok "Nasi Goreng" sebanyak 50 porsi
- Sebagai Admin, saya ingin melihat history pergerakan stok
- Sebagai Captain, saya ingin mendapat notifikasi jika stok menipis saat order
- Sistem otomatis mengurangi stok saat order dibuat

**Database:**
- Table: `stock_movements`
  - id, store_id, product_id, type, qty_change, qty_after
  - reference_type, reference_id, notes, created_by, created_at

---

### 3.5 Tax Rules (Pajak)

#### 3.5.1 PB1 (Pajak Restoran)

**Features:**
- Rate: Default 10%
- Berlaku untuk: Dine-in, Take Away, Delivery
- Base perhitungan: (Subtotal - Diskon) + Service Charge
- Bisa diatur per store

**Formula:**
```
taxable_base = subtotal - discount_total
service_charge = taxable_base × SC% (skip jika take_away)
PB1 = (taxable_base + SC) × PB1%
```

#### 3.5.2 Service Charge (SC)

**Features:**
- Rate: Default 5%
- Berlaku untuk: Dine-in, Delivery
- **TIDAK berlaku untuk: Take Away**
- Base perhitungan: (Subtotal - Diskon)

**User Stories:**
- Sebagai Admin, saya ingin mengubah rate PB1 dari 10% menjadi 11%
- Sebagai Admin, saya ingin menonaktifkan SC untuk delivery
- Sebagai Captain, saya ingin SC tidak dikenakan untuk order take away
- Sebagai Captain, saya melihat breakdown pajak di struk pembayaran

**Database:**
- Table: `tax_rules`
  - id, store_id, code (PB1/SC), name, rate
  - apply_dine_in, apply_take_away, apply_delivery
  - include_sc_in_base (untuk PB1), is_active

---

### 3.6 Discount Management

#### 3.6.1 Discount Master

**Features:**
- Scope: **Item** (per produk) atau **Order** (total order)
- Type: **Percent** (%) atau **Fixed** (Rp)
- Max discount untuk diskon percent (plafon)
- Min order amount (minimal transaksi)
- Bisa diaplikasikan di:
  - **Order stage** (saat buat order)
  - **Payment stage** (saat bayar)
- Requires approval (perlu PIN admin untuk diskon tertentu)
- Periode aktif (start_at, end_at)

**Contoh Diskon:**
```
1. Member 10% (order level, percent, max 50.000)
2. Promo Payday Rp 25.000 (order level, fixed, min order 100.000)
3. Diskon Item Nasi Goreng 20% (item level, percent)
4. Buy 2 Get 1 (custom logic, item level)
```

**User Stories:**
- Sebagai Admin, saya ingin membuat diskon "Member 10%" untuk semua order
- Sebagai Admin, saya ingin membuat promo "Cashback Rp 25.000" untuk order min 100rb
- Sebagai Captain, saya ingin apply diskon "Member 10%" saat customer order
- Sebagai Captain, saya ingin apply diskon tambahan saat pembayaran
- Sebagai Captain, saya perlu PIN admin untuk apply diskon lebih dari 20%

**Database:**
- Table: `discounts`
  - id, store_id, name, scope (item/order), type (percent/fixed), value
  - max_discount, min_order_amount
  - allow_at_order, allow_at_payment, requires_approval
  - start_at, end_at, is_active

---

### 3.7 Order Management

#### 3.7.1 Tables Management

**Features:**
- Nomor meja unik per store
- QR code per meja untuk customer self-order (future)
- Status: available/occupied
- QR token untuk akses menu

**User Stories:**
- Sebagai Admin, saya ingin menambah meja "A1" sampai "A10"
- Sebagai Captain, saya ingin melihat meja mana yang sudah ada order
- Sebagai Customer, saya ingin scan QR code meja untuk lihat menu

**Database:**
- Table: `tables`
  - id, store_id, number, qr_token, is_active

#### 3.7.2 Order Creation & Management

**Features:**
- Order type: Dine-in, Take Away, Delivery
- Source: POS (captain) atau QR (customer)
- Order number: Auto-generate (INV-20261030-0001)
- Status: open → paid / void / merged
- Customer info: nama, jumlah tamu
- Notes untuk order

**Order Flow:**
```
1. Captain pilih meja/take away
2. Captain input customer name (optional)
3. Captain pilih produk + variant
4. Captain input qty & notes per item
5. Captain bisa apply diskon order
6. Order dibuat dengan status "open"
7. Item dikirim ke kitchen
8. Kitchen update status item: preparing → ready → served
9. Captain proses payment
10. Order status jadi "paid"
```

**User Stories:**
- Sebagai Captain, saya ingin membuat order baru untuk meja A1
- Sebagai Captain, saya ingin menambah item ke order yang sudah ada
- Sebagai Captain, saya ingin mengedit qty item sebelum kirim ke kitchen
- Sebagai Captain, saya ingin void item tertentu dengan alasan
- Sebagai Kitchen, saya ingin melihat semua order yang harus dimasak
- Sebagai Kitchen, saya ingin update status item menjadi "ready"

**Database:**
- Table: `orders`
  - id, store_id, table_id, order_number, order_type, source, status
  - customer_name, guest_count, notes
  - subtotal, discount_total, service_charge_total, tax_total, rounding, grand_total, paid_total
  - is_complimentary, complimentary_amount, complimentary_reason, complimentary_by
  - merged_into_order_id, created_by, opened_at, closed_at, voided_by, void_reason

- Table: `order_items`
  - id, order_id, original_order_id (untuk merge), product_id, product_name
  - qty, unit_price, variant_total, discount_amount, line_total
  - notes, status (pending/preparing/ready/served/void)
  - is_complimentary, complimentary_reason, complimentary_by
  - voided_by, void_reason, sent_to_kitchen_at, created_by

- Table: `order_item_variants`
  - id, order_item_id, variant_option_id, group_name, option_name, price_adjustment

#### 3.7.3 Order Calculation

**Perhitungan Order:**
```javascript
// Per Item
line_total = (unit_price + variant_total) × qty - discount_amount

// Order Level
subtotal = SUM(order_items.line_total)
discount_total = SUM(order_discounts.amount)
taxable_base = subtotal - discount_total

// Service Charge (skip jika take_away)
if (order_type !== 'take_away') {
  service_charge = taxable_base × SC_rate
} else {
  service_charge = 0
}

// PB1 Tax
tax_total = (taxable_base + service_charge) × PB1_rate

// Grand Total
grand_total = taxable_base + service_charge + tax_total + rounding
```

---

### 3.8 Discount Application

#### 3.8.1 Item Discount

**Features:**
- Diskon khusus untuk item tertentu
- Bisa multiple diskon per item (jika diizinkan)
- Disimpan sebagai snapshot

**Database:**
- Table: `order_discounts`
  - id, order_id, order_item_id (NULL = order level), discount_id
  - name, type, value, amount
  - applied_stage (order/payment), approved_by, applied_by

#### 3.8.2 Order Discount

**Features:**
- Diskon untuk total order
- Bisa ditambahkan saat order atau saat payment
- Perlu approval jika requires_approval = 1

**User Stories:**
- Sebagai Captain, saya ingin apply diskon "Member 10%" untuk total order
- Sebagai Captain, saya ingin apply diskon item untuk "Nasi Goreng" saja
- Sebagai Captain, saya perlu PIN admin untuk diskon lebih dari 20%

---

### 3.9 Merge Order

**Features:**
- Gabungkan 2 atau lebih order menjadi 1
- Use case: 
  - Meja A1 dan A2 digabung
  - Customer pindah meja
  - Group booking
- Order source tetap di original_order_id
- Order yang digabung status jadi "merged"

**Flow Merge:**
```
1. Captain pilih order target (yang akan digabung ke)
2. Captain pilih order source (yang akan dipindah)
3. Semua items dari source dipindah ke target
4. Source order status = "merged"
5. Target order update subtotal, tax, dll
```

**User Stories:**
- Sebagai Captain, saya ingin menggabungkan order meja A1 dan A2
- Sebagai Captain, saya ingin melihat history merge order
- Sebagai Admin, saya ingin laporan order yang di-merge

**Database:**
- Table: `order_merges`
  - id, target_order_id, source_order_id, merged_by, merged_at

---

### 3.10 Split Bill (Payment)

**Features:**
- Pecah order menjadi beberapa bill
- Use case:
  - Group makan, bayar terpisah per orang
  - Bayar sebagian dulu, sisanya nanti
- Bisa split berdasarkan:
  - **Item** (Bill 1: item A & B, Bill 2: item C & D)
  - **Nominal** (Bill 1: 50%, Bill 2: 50%)

**Split by Item:**
```
Order Total: 200.000
├── Bill 1 (Budi): Nasi Goreng + Jus = 50.000
├── Bill 2 (Ani): Mie Goreng + Es Teh = 45.000
└── Bill 3 (Citra): Ayam + Kopi = 105.000
```

**Split by Nominal:**
```
Order Total: 300.000
├── Payment 1 (Cash): 150.000
├── Payment 2 (QRIS): 100.000
└── Payment 3 (Debit): 50.000
```

**User Stories:**
- Sebagai Captain, saya ingin split bill untuk meja A1 jadi 3 bill
- Sebagai Captain, saya ingin assign item tertentu ke bill 1
- Sebagai Captain, saya ingin split pembayaran 50% cash, 50% QRIS
- Sebagai Customer, saya ingin bayar bagian saya saja

**Database:**
- Table: `order_bills`
  - id, order_id, bill_number, label
  - subtotal, discount_total, service_charge_total, tax_total, rounding, grand_total, paid_total
  - status (unpaid/paid/void), paid_at

- Table: `order_bill_items`
  - id, bill_id, order_item_id, qty, amount

---

### 3.11 Payment Methods

**Features:**
- Multiple payment methods per store
- Types: cash, QRIS, debit, credit, e-wallet, transfer
- Requires reference (approval number untuk EDC/QRIS)
- Fee percent (MDR) untuk laporan
- Multi payment: bisa bayar pakai 2-3 metode sekaligus

**Payment Methods:**
1. Cash
2. QRIS
3. Debit Card
4. Credit Card
5. GoPay
6. OVO
7. DANA
8. ShopeePay
9. Transfer Bank

**Multi Payment Example:**
```
Total Bill: 150.000
├── Cash: 100.000
└── QRIS: 50.000
```

**User Stories:**
- Sebagai Admin, saya ingin menambah metode pembayaran "LinkAja"
- Sebagai Captain, saya ingin proses pembayaran cash dengan kembalian
- Sebagai Captain, saya ingin split payment: 100k cash + 50k QRIS
- Sebagai Captain, saya ingin void payment jika salah input

**Database:**
- Table: `payment_methods`
  - id, store_id, code, name, type
  - requires_reference, fee_percent, sort_order, is_active

- Table: `payments`
  - id, order_id, bill_id (NULL jika tidak split), payment_method_id
  - amount, tendered_amount (uang diterima), change_amount (kembalian)
  - reference_no (no. approval), status (paid/void/refunded)
  - paid_at, received_by, voided_by, void_reason

---

### 3.12 Compliment (Gratis)

**Features:**
- Bisa gratis per item atau seluruh order
- Alasan complement (ulang tahun, complaint, loyalty, dll)
- User yang memberikan complement
- Tetap masuk laporan untuk tracking

**Levels:**
1. **Item Level**: Item tertentu digratiskan
2. **Order Level**: Seluruh order digratiskan

**User Stories:**
- Sebagai Captain, saya ingin memberikan complement "Es Teh" untuk customer
- Sebagai Captain, saya ingin memberikan complement seluruh order untuk VIP
- Sebagai Admin, saya ingin melihat laporan complement per bulan
- Sebagai Captain, saya perlu alasan saat memberikan complement

**Database:**
- Order level: `orders.is_complimentary`, `complimentary_amount`, `complimentary_reason`, `complimentary_by`
- Item level: `order_items.is_complimentary`, `complimentary_reason`, `complimentary_by`

---

### 3.13 Void Order/Item

**Features:**
- Batalkan order atau item tertentu
- Alasan void (salah input, customer cancel, dll)
- User yang melakukan void
- Return stock jika track_stock = ON
- Perlu approval untuk void setelah kirim ke kitchen

**User Stories:**
- Sebagai Captain, saya ingin void order karena customer cancel
- Sebagai Captain, saya ingin void 1 item saja karena salah input
- Sebagai Admin, saya ingin melihat laporan void per bulan
- Sebagai Captain, saya perlu PIN admin untuk void order yang sudah dibayar

**Database:**
- `orders.voided_by`, `void_reason`
- `order_items.voided_by`, `void_reason`, `status = 'void'`

---

## 4. Reporting & Analytics

### 4.1 Sales Report

**Features:**
- Laporan penjualan per hari/minggu/bulan
- Filter by: store, tanggal, payment method
- Metrics:
  - Total transaksi
  - Total revenue
  - Average order value
  - Total discount given
  - Total tax collected
  - Total complement
  - Payment method breakdown

### 4.2 Product Report

**Features:**
- Best selling products
- Product performance by category
- Stock movement report
- Low stock alert

### 4.3 Staff Performance

**Features:**
- Order created by staff
- Average handling time
- Discount given by staff
- Void/cancel rate

---

## 5. Technical Requirements

### 5.1 Database

**Tables Summary:**
1. roles
2. users
3. stores
4. tables
5. categories
6. products
7. variant_groups
8. variant_options
9. stock_movements
10. tax_rules
11. discounts
12. payment_methods
13. orders
14. order_items
15. order_item_variants
16. order_discounts
17. order_taxes
18. order_merges
19. order_bills
20. order_bill_items
21. payments

Total: **21 tables**

### 5.2 API Endpoints

#### Auth
- POST `/api/auth/register` - Register user baru
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

#### Stores
- GET `/api/stores` - Get all stores
- GET `/api/stores/:id` - Get store by ID
- POST `/api/stores` - Create store
- PUT `/api/stores/:id` - Update store
- DELETE `/api/stores/:id` - Delete store

#### Products
- GET `/api/stores/:storeId/products` - Get all products
- GET `/api/products/:id` - Get product by ID
- POST `/api/stores/:storeId/products` - Create product
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product
- GET `/api/products?table=A1&store_id=xxx` - Public menu (QR)

#### Categories
- GET `/api/stores/:storeId/categories` - Get all categories
- POST `/api/stores/:storeId/categories` - Create category
- PUT `/api/categories/:id` - Update category
- DELETE `/api/categories/:id` - Delete category

#### Variants
- GET `/api/products/:productId/variants` - Get variant groups
- POST `/api/products/:productId/variants` - Create variant group
- POST `/api/variant-groups/:groupId/options` - Add variant option

#### Orders
- GET `/api/stores/:storeId/orders` - Get all orders
- GET `/api/orders/:id` - Get order by ID
- POST `/api/orders` - Create order
- PUT `/api/orders/:id` - Update order
- POST `/api/orders/:id/items` - Add item to order
- PUT `/api/order-items/:id` - Update order item
- DELETE `/api/order-items/:id` - Void order item
- POST `/api/orders/:id/merge` - Merge orders
- POST `/api/orders/:id/split` - Split bill
- POST `/api/orders/:id/payment` - Process payment
- POST `/api/orders/:id/void` - Void order

#### Discounts
- GET `/api/stores/:storeId/discounts` - Get all discounts
- POST `/api/orders/:orderId/discounts` - Apply discount

#### Tables
- GET `/api/stores/:storeId/tables` - Get all tables
- POST `/api/stores/:storeId/tables` - Create table
- PUT `/api/tables/:id` - Update table

#### Reports
- GET `/api/reports/sales` - Sales report
- GET `/api/reports/products` - Product report
- GET `/api/reports/staff` - Staff performance

---

## 6. User Interface

### 6.1 Captain/Kasir Interface

**Main Screens:**
1. **Dashboard**
   - Active orders
   - Table status
   - Quick stats

2. **Order Screen**
   - Table/Order selection
   - Product list with categories
   - Cart with selected items
   - Apply discount
   - Send to kitchen
   - Process payment

3. **Payment Screen**
   - Order summary
   - Tax breakdown
   - Discount applied
   - Payment method selection
   - Split bill option
   - Print receipt

4. **Tables View**
   - Visual table layout
   - Occupied/Available status
   - Quick access to order

### 6.2 Kitchen Interface

**Main Screens:**
1. **Order Queue**
   - Pending orders
   - Order items by category
   - Update status: preparing → ready

2. **Completed Orders**
   - History today

### 6.3 Admin Interface

**Main Screens:**
1. **Dashboard**
   - Daily sales
   - Top products
   - Low stock alert

2. **Product Management**
   - Product list
   - Add/Edit product
   - Manage variants
   - Stock adjustment

3. **Settings**
   - Tax rules
   - Discounts
   - Payment methods
   - Users management

4. **Reports**
   - Sales report
   - Product report
   - Stock report

---

## 7. Future Enhancements (Phase 2)

1. **Customer App (QR Order)**
   - Scan QR → lihat menu
   - Order langsung dari meja
   - Call waiter
   - Request bill

2. **Loyalty Program**
   - Point system
   - Member tiers
   - Reward redemption

3. **Kitchen Display System (KDS)**
   - Real-time order display
   - Order prioritization
   - Bump bar

4. **Inventory Management**
   - Recipe/BOM management
   - Auto purchase order
   - Supplier management

5. **Advanced Analytics**
   - Trend analysis
   - Forecasting
   - Customer behavior

6. **Integration**
   - Accounting software
   - Online delivery (GoFood, GrabFood)
   - Payment gateway

---

## 8. Success Metrics

### 8.1 Performance KPIs
- Order processing time < 30 seconds
- Payment processing time < 60 seconds
- System uptime > 99.5%
- Response time API < 500ms

### 8.2 Business KPIs
- Increase order accuracy (reduce void/cancel rate)
- Reduce stock discrepancy
- Increase table turnover rate
- Improve customer satisfaction

---

## 9. Glossary

- **PB1**: Pajak Barang 1 (Pajak Restoran)
- **SC**: Service Charge
- **SKU**: Stock Keeping Unit
- **Void**: Pembatalan order/item
- **Complement**: Pemberian gratis
- **Split Bill**: Pemisahan tagihan
- **Merge Order**: Penggabungan order
- **MDR**: Merchant Discount Rate (fee bank untuk non-tunai)

---

**Document Version**: 1.0  
**Last Updated**: October 30, 2026  
**Author**: Shaokao Development Team
