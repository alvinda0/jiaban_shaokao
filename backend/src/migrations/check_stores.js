/**
 * Check Stores Script
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shaokao_db'
};

async function checkStores() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Get all stores
    const [stores] = await connection.query('SELECT * FROM stores');
    
    console.log(`📊 Found ${stores.length} stores:\n`);
    
    if (stores.length === 0) {
      console.log('⚠️  No stores found! Please create a store first.');
    } else {
      stores.forEach((store, index) => {
        console.log(`${index + 1}. ID: ${store.id}`);
        console.log(`   Name: ${store.name}`);
        console.log(`   Active: ${store.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${store.created_at}\n`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run check
checkStores()
  .then(() => {
    console.log('\n✨ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed:', error);
    process.exit(1);
  });
