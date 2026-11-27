-- Test Sales Report Query untuk 2026-11-27
-- Order yang ada: opened_at = 2026-11-27T06:02:44.251Z (UTC) = 2026-11-27 13:02:44 (Jakarta)

-- Store ID: 2a217fd0-5140-4e31-b137-c486ef41757b
-- Date: 2026-11-27

SELECT '1. Debug: Check raw order data' as step;
SELECT 
  id,
  order_number,
  status,
  paid_total,
  grand_total,
  opened_at,
  opened_at AT TIME ZONE 'Asia/Jakarta' as opened_at_jakarta,
  DATE(opened_at AT TIME ZONE 'Asia/Jakarta') as date_jakarta
FROM orders
WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND opened_at >= '2026-11-27'::timestamp - interval '1 day'
ORDER BY opened_at DESC;

SELECT '2. Test date filter with UTC (should NOT match)' as step;
SELECT 
  COUNT(*) as count
FROM orders
WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND DATE(opened_at) >= '2026-11-27'::date
  AND DATE(opened_at) <= '2026-11-27'::date;

SELECT '3. Test date filter with Jakarta TZ (should match)' as step;
SELECT 
  COUNT(*) as count,
  DATE(opened_at AT TIME ZONE 'Asia/Jakarta') as date_jakarta
FROM orders
WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') >= '2026-11-27'::date
  AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') <= '2026-11-27'::date;

SELECT '4. Test with status and paid_total' as step;
SELECT 
  COUNT(*) as count,
  status,
  paid_total
FROM orders
WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND paid_total > 0
  AND status = 'paid'
  AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') >= '2026-11-27'::date
  AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') <= '2026-11-27'::date
GROUP BY status, paid_total;

SELECT '5. Full orders summary query' as step;
SELECT 
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.is_complimentary = true THEN o.id END) as total_complimentary_orders,
  SUM(o.discount_total) as total_discount,
  SUM(o.service_charge_total) as total_service_charge,
  SUM(o.tax_total) as total_tax,
  SUM(o.rounding) as total_rounding,
  SUM(o.grand_total) as total_grand_total,
  (SUM(o.grand_total) - SUM(COALESCE(o.complimentary_amount, 0))) as total_grand_total_after_complimentary,
  SUM(COALESCE(o.complimentary_amount, 0)) as total_complimentary_amount,
  AVG(o.grand_total) as avg_order_value
FROM orders o
WHERE o.store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND o.paid_total > 0
  AND o.status = 'paid'
  AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= '2026-11-27'::date
  AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= '2026-11-27'::date;

SELECT '6. Order items count' as step;
SELECT 
  SUM(oi.line_total) as total_subtotal,
  COUNT(*) as item_count
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
  AND o.status = 'paid'
  AND oi.status != 'void'
  AND o.paid_total > 0
  AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= '2026-11-27'::date
  AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= '2026-11-27'::date;
