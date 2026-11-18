/**
 * Add qr_url column to tables
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

async function addColumn() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    console.log('📄 Adding qr_url column to tables...');
    
    // Check if column already exists
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM \`tables\` LIKE 'qr_url'`
    );
    
    if (columns.length > 0) {
      console.log('ℹ️  Column qr_url already exists');
    } else {
      await connection.query(
        'ALTER TABLE `tables` ADD COLUMN qr_url VARCHAR(500) NULL AFTER qr_token'
      );
      console.log('✅ Column qr_url added successfully!');
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
addColumn()
  .then(() => {
    console.log('\n✨ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
