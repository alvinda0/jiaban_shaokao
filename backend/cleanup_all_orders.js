require('dotenv').config();
const Pool = require('pg').Pool;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🗑️  Deleting all order-related data...\n');

    // Delete in correct order (foreign keys)
    const tables = [
      'payments',
      'order_bill_items',
      'order_bills',
      'stock_movements',
      'order_discounts',
      'order_taxes',
      'order_items',
      'orders'
    ];

    for (const table of tables) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`✓ Deleted ${result.rowCount} rows from ${table}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All order data deleted successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
})();
