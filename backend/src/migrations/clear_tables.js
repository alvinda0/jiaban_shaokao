/**
 * Clear All Tables
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

async function clearTables() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Get all tables
    const [tables] = await connection.query('SELECT * FROM `tables`');
    
    console.log(`📊 Found ${tables.length} tables in database\n`);
    
    if (tables.length > 0) {
      console.log('Tables:');
      tables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.number} (ID: ${t.id}, Store: ${t.store_id})`);
      });
      
      // Delete all
      console.log('\n🗑️  Deleting all tables...');
      await connection.query('DELETE FROM `tables`');
      console.log('✅ All tables deleted!');
    } else {
      console.log('ℹ️  No tables found.');
    }
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run
clearTables()
  .then(() => {
    console.log('\n✨ Clear complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Clear failed:', error);
    process.exit(1);
  });
