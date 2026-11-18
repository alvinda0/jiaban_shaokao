/**
 * Drop All Tables Script
 * PERINGATAN: Ini akan menghapus SEMUA data di database!
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shaokao_db',
  multipleStatements: true
};

async function dropAllTables() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 Foreign key checks disabled\n');

    // Get all tables
    const [tables] = await connection.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ?`,
      [config.database]
    );

    if (tables.length === 0) {
      console.log('ℹ️  No tables found in database');
      return;
    }

    console.log(`📋 Found ${tables.length} tables to drop:\n`);
    
    for (const row of tables) {
      const tableName = row.table_name || row.TABLE_NAME;
      console.log(`🗑️  Dropping table: ${tableName}`);
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n🔒 Foreign key checks re-enabled');
    console.log('🎉 All tables dropped successfully!');
    
  } catch (error) {
    console.error('❌ Drop tables failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run drop
dropAllTables()
  .then(() => {
    console.log('\n✨ Drop process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Drop process failed:', error);
    process.exit(1);
  });
