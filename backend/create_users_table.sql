-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  store_id UUID REFERENCES stores(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_store_id ON users(store_id);

-- Insert superuser
INSERT INTO users (name, email, password, role_id)
SELECT 
  'Superuser',
  'superuser@shaokao.com',
  '$2a$10$i9kTzrmPYZuPjSmmhfwVxeUFe0K0MqDXHAz.UTMmHa7hSfqPzBN5m',
  id
FROM roles 
WHERE name = 'superuser'
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- Create tax_rules table if not exists
CREATE TABLE IF NOT EXISTS tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, code)
);

-- Create payment_methods table if not exists
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, code)
);

-- Seed tax rules
INSERT INTO tax_rules (store_id, code, name, rate)
SELECT 
  s.id,
  'PB1',
  'PB1 (10%)',
  10
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM tax_rules WHERE code = 'PB1' AND store_id = s.id)
LIMIT 1;

INSERT INTO tax_rules (store_id, code, name, rate)
SELECT 
  s.id,
  'SC',
  'Service Charge (5%)',
  5
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM tax_rules WHERE code = 'SC' AND store_id = s.id)
LIMIT 1;

-- Seed payment methods
INSERT INTO payment_methods (store_id, name, code)
SELECT 
  s.id,
  'Tunai',
  'CASH'
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'CASH' AND store_id = s.id)
LIMIT 1;

INSERT INTO payment_methods (store_id, name, code)
SELECT 
  s.id,
  'Transfer Bank',
  'BANK_TRANSFER'
FROM stores s
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'BANK_TRANSFER' AND store_id = s.id)
LIMIT 1;
