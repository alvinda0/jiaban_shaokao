-- Add timezone column to stores table for multi-location support
-- Each store can have its own timezone for accurate reporting

ALTER TABLE stores ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Jakarta';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_timezone ON stores(timezone);

-- Add comment
COMMENT ON COLUMN stores.timezone IS 'Store timezone for accurate date/time filtering in reports (e.g., Asia/Jakarta, Asia/Bangkok, Europe/London)';
