-- SEED DEFAULT TAX RULES
-- Pajak: PB1 10% (semua tipe), SC 5% (TIDAK berlaku untuk take away)

INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'PB1', 'Pajak Restoran (PB1)', 10.00, true, true, true, true FROM stores
ON CONFLICT DO NOTHING;

INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base)
SELECT id, 'SC', 'Service Charge', 5.00, true, false, false, false FROM stores
ON CONFLICT DO NOTHING;
