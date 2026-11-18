-- Alter order_status enum
-- From: 'open','paid','void','merged'
-- To: 'pending','processing','paid','void','merged'

-- Step 1: Drop default constraint
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create new enum type
DROP TYPE IF EXISTS order_status_new CASCADE;
CREATE TYPE order_status_new AS ENUM ('pending','processing','paid','void','merged');

-- Step 3: Alter the table to use the new type
ALTER TABLE orders 
  ALTER COLUMN status TYPE order_status_new 
  USING (
    CASE status::text
      WHEN 'open' THEN 'pending'::order_status_new
      ELSE status::text::order_status_new
    END
  );

-- Step 4: Drop old type and rename new type
DROP TYPE IF EXISTS order_status CASCADE;
ALTER TYPE order_status_new RENAME TO order_status;

-- Step 5: Restore default value
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
