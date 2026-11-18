-- Add qr_url column to tables (already exists in 024, so this can be skipped if running fresh)
-- This file is kept for backward compatibility with existing databases
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tables' AND column_name='qr_url') THEN
    ALTER TABLE tables ADD COLUMN qr_url VARCHAR(500) NULL;
  END IF;
END $$;
