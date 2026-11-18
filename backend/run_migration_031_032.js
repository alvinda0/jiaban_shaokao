require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration 031 & 032...\n');

    // Migration 031: Alter order_status enum
    console.log('📝 Running migration 031: Alter order_status enum');
    const sql031 = fs.readFileSync(
      path.join(__dirname, 'src/migrations/031_alter_order_status_enum.sql'),
      'utf8'
    );
    await client.query(sql031);
    console.log('✅ Migration 031 completed\n');

    // Migration 032: Alter order_item_status enum
    console.log('📝 Running migration 032: Alter order_item_status enum');
    const sql032 = fs.readFileSync(
      path.join(__dirname, 'src/migrations/032_alter_order_item_status_enum.sql'),
      'utf8'
    );
    await client.query(sql032);
    console.log('✅ Migration 032 completed\n');

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   Order Status: pending, processing, paid, void, merged');
    console.log('   Order Item Status: pending, processing, ready, void');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
