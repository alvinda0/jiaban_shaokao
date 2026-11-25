const { pool } = require('../src/config/db');
require('dotenv').config();

async function clearOrders() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️ Clearing order-related tables...');
    
    // Delete in correct order to respect foreign keys
    const tables = [
      'order_taxes',
      'order_discounts',
      'payments',
      'order_items',
      'orders'
    ];
    
    for (const table of tables) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`✅ Deleted ${result.rowCount} rows from ${table}`);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ All order data cleared successfully!');
    
    // Verify
    const count = await client.query('SELECT COUNT(*) as cnt FROM orders');
    console.log(`📊 Remaining orders: ${count.rows[0].cnt}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing orders:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearOrders();
