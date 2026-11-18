/**
 * Basic Migration Script
 * Hanya migrasi untuk tabel: roles, users, stores, tables
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
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

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Daftar file migrasi yang akan dijalankan
    const migrations = [
      '001_create_roles.sql',
      '003_create_stores.sql',
      '024_create_tables.sql',
      '002_create_users.sql'
    ];

    for (const file of migrations) {
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File ${file} tidak ditemukan, skip...`);
        continue;
      }

      console.log(`📄 Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await connection.query(sql);
      console.log(`✅ ${file} executed successfully\n`);
    }

    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✨ Migration process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration process failed:', error);
    process.exit(1);
  });
