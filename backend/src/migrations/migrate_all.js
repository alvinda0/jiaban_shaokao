/**
 * Complete Migration Script
 * Menjalankan semua migrasi tabel POS
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

    // Daftar file migrasi yang akan dijalankan SECARA BERURUTAN
    const migrations = [
      // Base tables (urutan penting untuk foreign key)
      '001_create_roles.sql',
      '003_create_stores.sql',
      '024_create_tables.sql',  // Tables harus sebelum users & orders
      '002_create_users.sql',   // Setelah stores karena ada FK store_id
      
      // Extended tables
      '005_create_categories.sql',
      '006_create_products.sql',
      '007_create_variant_groups.sql',
      '008_create_variant_options.sql',
      '009_create_stock_movements.sql',
      '010_create_tax_rules.sql',
      '011_create_discounts.sql',
      '012_create_payment_methods.sql',
      '013_create_orders.sql',
      '014_create_order_items.sql',
      '015_create_order_item_variants.sql',
      '016_create_order_discounts.sql',
      '017_create_order_taxes.sql',
      '018_create_order_merges.sql',
      '019_create_order_bills.sql',
      '020_create_order_bill_items.sql',
      '021_create_payments.sql',
      
      // Seed data
      '022_seed_tax_rules.sql',
      '023_seed_payment_methods.sql'
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
    
    // Display summary
    console.log('\n📊 Database Summary:');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Total tables created: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
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
