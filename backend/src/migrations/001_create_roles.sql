CREATE TABLE IF NOT EXISTS roles (
  id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL UNIQUE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed roles
INSERT INTO roles (name) VALUES
  ('superuser'),
  ('admin'),
  ('captain'),
  ('kitchen')
ON CONFLICT (name) DO NOTHING;
