const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function clearAllOrders() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Clearing all orders and related data...\n');

    // Delete in correct order (foreign key dependencies)
    console.log('1️⃣  Deleting payments...');
    await client.query('DELETE FROM payments');
    console.log('   ✅ Done\n');

    console.log('2️⃣  Deleting bill_items...');
    await client.query('DELETE FROM bill_items');
    console.log('   ✅ Done\n');

    console.log('3️⃣  Deleting order_bill_items...');
    await client.query('DELETE FROM order_bill_items');
    console.log('   ✅ Done\n');

    console.log('4️⃣  Deleting order_bills...');
    await client.query('DELETE FROM order_bills');
    console.log('   ✅ Done\n');

    console.log('5️⃣  Deleting order_discounts...');
    await client.query('DELETE FROM order_discounts');
    console.log('   ✅ Done\n');

    console.log('6️⃣  Deleting order_taxes...');
    await client.query('DELETE FROM order_taxes');
    console.log('   ✅ Done\n');

    console.log('7️⃣  Deleting order_item_variants...');
    await client.query('DELETE FROM order_item_variants');
    console.log('   ✅ Done\n');

    console.log('8️⃣  Deleting order_items...');
    await client.query('DELETE FROM order_items');
    console.log('   ✅ Done\n');

    console.log('9️⃣  Deleting order_merges...');
    await client.query('DELETE FROM order_merges');
    console.log('   ✅ Done\n');

    console.log('🔟 Deleting orders...');
    await client.query('DELETE FROM orders');
    console.log('   ✅ Done\n');

    // Verify
    const counts = {};
    const tables = ['orders', 'order_items', 'order_item_variants', 'order_discounts', 'order_taxes', 'order_bills', 'order_bill_items', 'payments', 'bill_items'];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = result.rows[0].count;
    }

    console.log('📊 Final Status:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });

    console.log('\n✅ All orders cleared successfully!');
    console.log('💡 You can now create fresh test orders.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllOrders();
