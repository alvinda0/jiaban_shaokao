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
