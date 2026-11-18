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
