require('dotenv').config();
const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running migration 061: Add bill split support...\n');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src/migrations/061_add_bill_split_support.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration 061 completed successfully!');
    console.log('   - Added column: split_from_order_id to order_bills');
    console.log('   - Added column: split_method to order_bills');
    console.log('   - Added index: idx_order_bills_split_from');
    
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
