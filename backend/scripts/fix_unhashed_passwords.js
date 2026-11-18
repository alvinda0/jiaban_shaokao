#!/usr/bin/env node

/**
 * Fix unhashed passwords in users table
 * Usage: node scripts/fix_unhashed_passwords.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

async function fixUnhashedPasswords() {
  try {
    console.log('🔍 Checking for unhashed passwords...\n');

    // Get all users with unhashed passwords (bcrypt hashes start with $2)
    const result = await pool.query(
      `SELECT id, email, password 
       FROM users 
       WHERE password NOT LIKE '$2%' AND password IS NOT NULL
       ORDER BY created_at DESC`
    );

    console.log(`Found ${result.rows.length} users with unhashed passwords\n`);

    if (result.rows.length === 0) {
      console.log('✅ All passwords are properly hashed!');
      process.exit(0);
    }

    // Show users that need fixing
    console.log('Users with unhashed passwords:');
    console.log('-----------------------------------');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Password: ${user.password.substring(0, 50)}...`);
      console.log('');
    });

    console.log('🔐 Starting to hash passwords...\n');

    let fixed = 0;
    let errors = 0;

    for (const user of result.rows) {
      try {
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Update the database
        await pool.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );

        console.log(`✅ Fixed password for ${user.email}`);
        fixed++;
      } catch (err) {
        console.error(`❌ Error fixing password for ${user.email}:`, err.message);
        errors++;
      }
    }

    console.log('\n-----------------------------------');
    console.log(`Results:`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('-----------------------------------\n');

    if (fixed > 0) {
      console.log('🎉 All passwords have been successfully hashed!');
      console.log('✨ Users can now login with their passwords');
    }

    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

// Run the fix
fixUnhashedPasswords();
