-- Add logo_url column to stores
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='stores' AND column_name='logo_url') THEN
    ALTER TABLE stores ADD COLUMN logo_url TEXT NULL;
  END IF;
END $$;
