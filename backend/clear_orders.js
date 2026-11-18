const { pool } = require('./src/config/db');

async function clearOrders() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting to clear orders data...\n');

    await client.query('BEGIN');

    // Delete in correct order due to foreign keys
    console.log('Deleting payments...');
    const payments = await client.query('DELETE FROM payments');
    console.log(`✅ Deleted ${payments.rowCount} payments`);

    console.log('Deleting order_bill_items...');
    const billItems = await client.query('DELETE FROM order_bill_items');
    console.log(`✅ Deleted ${billItems.rowCount} bill items`);

    console.log('Deleting order_bills...');
    const bills = await client.query('DELETE FROM order_bills');
    console.log(`✅ Deleted ${bills.rowCount} bills`);

    console.log('Deleting order_merges...');
    const merges = await client.query('DELETE FROM order_merges');
    console.log(`✅ Deleted ${merges.rowCount} merges`);

    console.log('Deleting order_taxes...');
    const taxes = await client.query('DELETE FROM order_taxes');
    console.log(`✅ Deleted ${taxes.rowCount} order taxes`);

    console.log('Deleting order_discounts...');
    const discounts = await client.query('DELETE FROM order_discounts');
    console.log(`✅ Deleted ${discounts.rowCount} order discounts`);

    console.log('Deleting order_item_variants...');
    const variants = await client.query('DELETE FROM order_item_variants');
    console.log(`✅ Deleted ${variants.rowCount} order item variants`);

    console.log('Deleting order_items...');
    const items = await client.query('DELETE FROM order_items');
    console.log(`✅ Deleted ${items.rowCount} order items`);

    console.log('Deleting orders...');
    const orders = await client.query('DELETE FROM orders');
    console.log(`✅ Deleted ${orders.rowCount} orders`);

    // Also clear voucher usage if needed
    console.log('Deleting voucher_usage...');
    const voucherUsage = await client.query('DELETE FROM voucher_usage');
    console.log(`✅ Deleted ${voucherUsage.rowCount} voucher usage records`);

    // Reset voucher usage counts
    console.log('Resetting voucher usage counts...');
    const voucherReset = await client.query('UPDATE vouchers SET usage_count = 0');
    console.log(`✅ Reset usage count for ${voucherReset.rowCount} vouchers`);

    await client.query('COMMIT');

    console.log('\n🎉 Successfully cleared all orders data!');
    console.log('📊 Summary:');
    console.log(`   - ${orders.rowCount} orders`);
    console.log(`   - ${items.rowCount} order items`);
    console.log(`   - ${variants.rowCount} item variants`);
    console.log(`   - ${discounts.rowCount} discounts`);
    console.log(`   - ${taxes.rowCount} taxes`);
    console.log(`   - ${payments.rowCount} payments`);
    console.log(`   - ${bills.rowCount} bills`);
    console.log(`   - ${billItems.rowCount} bill items`);
    console.log(`   - ${merges.rowCount} merges`);
    console.log(`   - ${voucherUsage.rowCount} voucher usages`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing orders:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearOrders()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
