-- Insert superuser
INSERT INTO users (name, email, password, role_id, created_at, updated_at)
SELECT 
  'Superuser',
  'superuser@shaokao.com',
  '$2a$10$i9kTzrmPYZuPjSmmhfwVxeUFe0K0MqDXHAz.UTMmHa7hSfqPzBN5m', -- hashed 'superuser123'
  id,
  NOW(),
  NOW()
FROM roles WHERE name = 'superuser'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- Seed tax rules
INSERT INTO tax_rules (store_id, code, name, rate, created_at, updated_at)
SELECT 
  s.id,
  'PB1',
  'PB1 (10%)',
  10,
  NOW(),
  NOW()
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM tax_rules WHERE code = 'PB1' AND store_id = s.id)
LIMIT 1;

INSERT INTO tax_rules (store_id, code, name, rate, created_at, updated_at)
SELECT 
  s.id,
  'SC',
  'Service Charge (5%)',
  5,
  NOW(),
  NOW()
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM tax_rules WHERE code = 'SC' AND store_id = s.id)
LIMIT 1;

-- Seed payment methods
INSERT INTO payment_methods (store_id, name, code, is_active, created_at, updated_at)
SELECT 
  s.id,
  'Tunai',
  'CASH',
  true,
  NOW(),
  NOW()
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'CASH' AND store_id = s.id)
LIMIT 1;

INSERT INTO payment_methods (store_id, name, code, is_active, created_at, updated_at)
SELECT 
  s.id,
  'Transfer Bank',
  'BANK_TRANSFER',
  true,
  NOW(),
  NOW()
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'BANK_TRANSFER' AND store_id = s.id)
LIMIT 1;
