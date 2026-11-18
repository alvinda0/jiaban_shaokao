require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  max: 10,
});

async function clearAllOrders() {
  try {
    console.log('🗑️  Clearing all order data...');

    // Delete in correct order to respect foreign keys
    
    // 1. Delete order_bill_items
    const billItems = await pool.query('DELETE FROM order_bill_items');
    console.log(`✅ Deleted ${billItems.rowCount} bill items`);

    // 2. Delete order_bills
    const bills = await pool.query('DELETE FROM order_bills');
    console.log(`✅ Deleted ${bills.rowCount} bills`);

    // 3. Delete payments
    const payments = await pool.query('DELETE FROM payments');
    console.log(`✅ Deleted ${payments.rowCount} payments`);

    // 4. Delete voucher_usage
    const voucherUsage = await pool.query('DELETE FROM voucher_usage');
    console.log(`✅ Deleted ${voucherUsage.rowCount} voucher usages`);

    // 5. Delete order_taxes
    const taxes = await pool.query('DELETE FROM order_taxes');
    console.log(`✅ Deleted ${taxes.rowCount} order taxes`);

    // 6. Delete order_discounts
    const discounts = await pool.query('DELETE FROM order_discounts');
    console.log(`✅ Deleted ${discounts.rowCount} order discounts`);

    // 7. Delete order_item_variants
    const itemVariants = await pool.query('DELETE FROM order_item_variants');
    console.log(`✅ Deleted ${itemVariants.rowCount} order item variants`);

    // 8. Delete order_items
    const items = await pool.query('DELETE FROM order_items');
    console.log(`✅ Deleted ${items.rowCount} order items`);

    // 9. Delete orders
    const orders = await pool.query('DELETE FROM orders');
    console.log(`✅ Deleted ${orders.rowCount} orders`);

    console.log('\n✨ All order data cleared successfully!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

clearAllOrders();
