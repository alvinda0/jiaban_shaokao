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
