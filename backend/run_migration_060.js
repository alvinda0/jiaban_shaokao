require('dotenv').config();
const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running migration 060: Add merged_from_order_number column...\n');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src/migrations/060_add_merged_from_order_number.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration 060 completed successfully!');
    console.log('   - Added column: merged_from_order_number to order_items');
    console.log('   - Added index: idx_order_items_merged_from');
    
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
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
