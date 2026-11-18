require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function cleanup() {
  try {
    console.log('🧹 Cleaning up old split bills...\n');
    
    // Delete bill items
    const deleteItemsResult = await pool.query(`
      DELETE FROM order_bill_items 
      WHERE bill_id IN (
        SELECT id FROM order_bills 
        WHERE order_id IN (
          SELECT id FROM orders WHERE order_number = 'INV-20261117-0001'
        )
      )
    `);
    console.log(`✅ Deleted ${deleteItemsResult.rowCount} bill items`);
    
    // Delete bills
    const deleteBillsResult = await pool.query(`
      DELETE FROM order_bills 
      WHERE order_id IN (
        SELECT id FROM orders WHERE order_number = 'INV-20261117-0001'
      )
    `);
    console.log(`✅ Deleted ${deleteBillsResult.rowCount} bills`);
    
    // Reset is_split flag
    const updateResult = await pool.query(`
      UPDATE orders 
      SET is_split = FALSE 
      WHERE order_number = 'INV-20261117-0001'
    `);
    console.log(`✅ Updated ${updateResult.rowCount} orders`);
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanup();
