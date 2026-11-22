-- Add bill_id column to payments table for split bill tracking
-- This allows tracking which bill each payment belongs to for split payments

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'bill_id'
  ) THEN
    ALTER TABLE payments
    ADD COLUMN bill_id UUID REFERENCES bills(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_payments_bill_id ON payments(bill_id);
  END IF;
END $$;
