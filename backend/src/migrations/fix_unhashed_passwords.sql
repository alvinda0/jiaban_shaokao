-- Fix unhashed passwords in users table
-- This script identifies and rehashes any plain text passwords

-- First, backup the users table
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- For testing purposes, check which users have unhashed passwords
-- Hashed bcrypt passwords start with $2a$, $2b$, or $2y$
SELECT id, email, password, created_at
FROM users
WHERE password NOT LIKE '$2%'
ORDER BY created_at DESC;

-- Note: To properly hash existing plain-text passwords, you'll need to:
-- 1. Identify users with unhashed passwords from the SELECT above
-- 2. Use a Node.js script to hash them with bcrypt
-- 3. Update the database with the hashed values

-- Here's the Node.js code to fix this:
/*
const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function fixUnhashedPasswords() {
  try {
    // Get all users with unhashed passwords
    const result = await pool.query(
      "SELECT id, email, password FROM users WHERE password NOT LIKE '$2%'"
    );

    console.log(`Found ${result.rows.length} users with unhashed passwords`);

    for (const user of result.rows) {
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Update the database
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );

      console.log(`✅ Fixed password for ${user.email}`);
    }

    console.log('✅ All passwords have been hashed');
  } catch (err) {
    console.error('Error fixing passwords:', err);
  }
}

fixUnhashedPasswords();
*/

-- Example for single user (if you know the plain password):
-- This is NOT recommended for production
-- UPDATE users SET password = '$2b$10$...' WHERE id = 'user-id';
