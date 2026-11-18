require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.is_active,
        r.name as role_name,
        u.store_id,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nRun this command to create a default admin user:');
      console.log('node create_default_user.js\n');
    } else {
      console.log(`✅ Found ${result.rows.length} user(s):\n`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role_name}`);
        console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`   Store ID: ${user.store_id || 'None'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
