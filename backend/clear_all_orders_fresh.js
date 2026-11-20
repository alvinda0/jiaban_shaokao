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
    console.log('1️⃣  Deleting order_payments...');
    await client.query('DELETE FROM order_payments');
    console.log('   ✅ Done\n');

    console.log('2️⃣  Deleting order_bills...');
    await client.query('DELETE FROM order_bills');
    console.log('   ✅ Done\n');

    console.log('3️⃣  Deleting order_discounts...');
    await client.query('DELETE FROM order_discounts');
    console.log('   ✅ Done\n');

    console.log('4️⃣  Deleting order_items...');
    await client.query('DELETE FROM order_items');
    console.log('   ✅ Done\n');

    console.log('5️⃣  Deleting orders...');
    await client.query('DELETE FROM orders');
    console.log('   ✅ Done\n');

    // Verify
    const orderCount = await client.query('SELECT COUNT(*) FROM orders');
    const itemCount = await client.query('SELECT COUNT(*) FROM order_items');
    const discountCount = await client.query('SELECT COUNT(*) FROM order_discounts');
    const paymentCount = await client.query('SELECT COUNT(*) FROM order_payments');
    const billCount = await client.query('SELECT COUNT(*) FROM order_bills');

    console.log('📊 Final Status:');
    console.log(`   Orders: ${orderCount.rows[0].count}`);
    console.log(`   Order Items: ${itemCount.rows[0].count}`);
    console.log(`   Order Discounts: ${discountCount.rows[0].count}`);
    console.log(`   Order Payments: ${paymentCount.rows[0].count}`);
    console.log(`   Order Bills: ${billCount.rows[0].count}`);

    console.log('\n✅ All orders cleared successfully!');
    console.log('💡 Now you can create fresh test orders.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllOrders();
