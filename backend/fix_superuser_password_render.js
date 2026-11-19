/**
 * Fix Superuser Password
 * 
 * This script updates the superuser password hash in the database.
 * It uses environment variables configured on Render.
 * 
 * Run with: npm run fix:superuser
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixSuperuserPassword() {
  // Use environment variables (configured on Render)
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shaokao',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '123456',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const client = await pool.connect();
  try {
    console.log('🔗 Connecting to database...');
    console.log(`📦 Database: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    
    // New correct hash for superuser123
    // Generated via: bcrypt.hash('superuser123', 10)
    const newHash = '$2b$10$J2zlW.syp2EdlncMQ1a9zOK7VV.CMLfSWOvykbLzpDbBJmCFtDs7S';
    
    // Update password
    console.log('\n🔐 Updating superuser password...');
    const updateResult = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, password',
      [newHash, 'superuser@shaokao.com']
    );
    
    if (updateResult.rowCount === 0) {
      console.error('❌ Superuser not found with email: superuser@shaokao.com');
      process.exit(1);
    }
    
    console.log('✅ Password updated successfully!');
    console.log('Row:', updateResult.rows[0]);
    
    // Verify by selecting the user
    const verifyResult = await client.query(
      'SELECT id, email, is_active FROM users WHERE email = $1',
      ['superuser@shaokao.com']
    );
    
    console.log('\n✨ Verification:');
    console.log(verifyResult.rows[0]);
    
    console.log('\n🎉 Superuser password fixed!');
    console.log('Email: superuser@shaokao.com');
    console.log('Password: superuser123');
    console.log('\nYou can now login with these credentials.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

fixSuperuserPassword();
