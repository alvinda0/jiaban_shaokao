-- Check specific order ID from user response
SELECT 
  id,
  store_id,
  order_number,
  status,
  paid_total,
  grand_total,
  opened_at
FROM orders
WHERE id = '97a38e2d-512c-4a88-8a84-c7c7518b5dcb';

-- Check if order items exist
SELECT 
  id,
  order_id,
  product_name,
  qty,
  line_total
FROM order_items
WHERE order_id = '97a38e2d-512c-4a88-8a84-c7c7518b5dcb';
