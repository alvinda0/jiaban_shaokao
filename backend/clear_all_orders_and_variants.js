const { pool } = require('./src/config/db');

async function clearAllOrders() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  Starting to clear all order data...\n');
    
    // 1. Delete order_item_variants (must be first due to foreign key)
    const variantsResult = await client.query('DELETE FROM order_item_variants');
    console.log(`✅ Deleted ${variantsResult.rowCount} order item variants`);
    
    // 2. Delete order_bill_items
    const billItemsResult = await client.query('DELETE FROM order_bill_items');
    console.log(`✅ Deleted ${billItemsResult.rowCount} order bill items`);
    
    // 3. Delete order_bills
    const billsResult = await client.query('DELETE FROM order_bills');
    console.log(`✅ Deleted ${billsResult.rowCount} order bills`);
    
    // 4. Delete payments
    const paymentsResult = await client.query('DELETE FROM payments');
    console.log(`✅ Deleted ${paymentsResult.rowCount} payments`);
    
    // 5. Delete order_taxes
    const taxesResult = await client.query('DELETE FROM order_taxes');
    console.log(`✅ Deleted ${taxesResult.rowCount} order taxes`);
    
    // 6. Delete order_discounts
    const discountsResult = await client.query('DELETE FROM order_discounts');
    console.log(`✅ Deleted ${discountsResult.rowCount} order discounts`);
    
    // 7. Delete order_items
    const itemsResult = await client.query('DELETE FROM order_items');
    console.log(`✅ Deleted ${itemsResult.rowCount} order items`);
    
    // 8. Delete orders
    const ordersResult = await client.query('DELETE FROM orders');
    console.log(`✅ Deleted ${ordersResult.rowCount} orders`);
    
    // 9. Delete voucher_usage (optional - if you want to reset voucher usage)
    const voucherUsageResult = await client.query('DELETE FROM voucher_usage');
    console.log(`✅ Deleted ${voucherUsageResult.rowCount} voucher usage records`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Successfully cleared all order data!');
    console.log('📊 Summary:');
    console.log(`   - ${ordersResult.rowCount} orders deleted`);
    console.log(`   - ${itemsResult.rowCount} order items deleted`);
    console.log(`   - ${variantsResult.rowCount} order item variants deleted`);
    console.log(`   - ${discountsResult.rowCount} order discounts deleted`);
    console.log(`   - ${taxesResult.rowCount} order taxes deleted`);
    console.log(`   - ${paymentsResult.rowCount} payments deleted`);
    console.log(`   - ${billsResult.rowCount} order bills deleted`);
    console.log(`   - ${billItemsResult.rowCount} order bill items deleted`);
    console.log(`   - ${voucherUsageResult.rowCount} voucher usage records deleted`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing order data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
clearAllOrders()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
