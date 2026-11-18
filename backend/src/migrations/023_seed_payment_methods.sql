-- SEED DEFAULT PAYMENT METHODS
-- Metode pembayaran standar untuk semua store

INSERT INTO payment_methods (store_id, code, name, type, requires_reference, sort_order)
SELECT s.id, p.code, p.name, p.type::payment_method_type, p.req, p.sort
FROM stores s
CROSS JOIN (
  SELECT 'cash' AS code, 'Cash' AS name, 'cash' AS type, false AS req, 1 AS sort UNION ALL
  SELECT 'qris', 'QRIS', 'qris', true, 2 UNION ALL
  SELECT 'debit', 'Debit', 'debit', true, 3 UNION ALL
  SELECT 'credit', 'Kartu Kredit', 'credit', true, 4 UNION ALL
  SELECT 'gopay', 'GoPay', 'ewallet', true, 5 UNION ALL
  SELECT 'ovo', 'OVO', 'ewallet', true, 6 UNION ALL
  SELECT 'dana', 'DANA', 'ewallet', true, 7 UNION ALL
  SELECT 'shopeepay', 'ShopeePay', 'ewallet', true, 8 UNION ALL
  SELECT 'transfer', 'Transfer Bank', 'transfer', true, 9
) p
ON CONFLICT DO NOTHING;
