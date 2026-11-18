-- Add PIN column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP DEFAULT NULL;

-- Create index on pin for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);

-- Add comments
COMMENT ON COLUMN users.pin IS '6-digit PIN for order cancellations (requires captain/superuser role)';
COMMENT ON COLUMN users.pin_attempts IS 'Number of failed PIN attempts';
COMMENT ON COLUMN users.pin_locked_until IS 'Timestamp until which PIN is locked due to failed attempts';
