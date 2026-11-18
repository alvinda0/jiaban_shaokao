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
