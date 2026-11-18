/**
 * Add type column to tables
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

    console.log('📄 Adding type column to tables...');
    
    // Check if column already exists
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM \`tables\` LIKE 'type'`
    );
    
    if (columns.length > 0) {
      console.log('ℹ️  Column type already exists');
    } else {
      await connection.query(
        "ALTER TABLE `tables` ADD COLUMN type ENUM('reguler','lantai2','takeaway','vvip') NOT NULL DEFAULT 'reguler' AFTER number"
      );
      console.log('✅ Column type added successfully!');
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
