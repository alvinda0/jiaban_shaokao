-- Alter order_item_status enum
-- From: 'pending','preparing','ready','served','void'
-- To: 'pending','processing','ready','void'

-- Step 1: Drop default constraint
ALTER TABLE order_items ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create new enum type
DROP TYPE IF EXISTS order_item_status_new CASCADE;
CREATE TYPE order_item_status_new AS ENUM ('pending','processing','ready','void');

-- Step 3: Alter the table to use the new type
ALTER TABLE order_items 
  ALTER COLUMN status TYPE order_item_status_new 
  USING (
    CASE status::text
      WHEN 'preparing' THEN 'processing'::order_item_status_new
      WHEN 'served' THEN 'ready'::order_item_status_new
      ELSE status::text::order_item_status_new
    END
  );

-- Step 4: Drop old type and rename new type
DROP TYPE IF EXISTS order_item_status CASCADE;
ALTER TYPE order_item_status_new RENAME TO order_item_status;

-- Step 5: Restore default value
ALTER TABLE order_items ALTER COLUMN status SET DEFAULT 'pending'::order_item_status;
