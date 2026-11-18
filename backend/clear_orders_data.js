require('dotenv').config();
const { pool } = require('./src/config/db');

async function clearOrdersData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  Clearing all order-related data...\n');
    
    // Delete in correct order to respect foreign keys
    
    // 1. Delete payments first
    const paymentsResult = await client.query('DELETE FROM payments');
    console.log(`✅ Deleted ${paymentsResult.rowCount} payments`);
    
    // 2. Delete order_taxes
    const taxesResult = await client.query('DELETE FROM order_taxes');
    console.log(`✅ Deleted ${taxesResult.rowCount} order taxes`);
    
    // 3. Delete order_discounts
    const discountsResult = await client.query('DELETE FROM order_discounts');
    console.log(`✅ Deleted ${discountsResult.rowCount} order discounts`);
    
    // 4. Delete order_item_variants
    const variantsResult = await client.query('DELETE FROM order_item_variants');
    console.log(`✅ Deleted ${variantsResult.rowCount} order item variants`);
    
    // 5. Delete order_items
    const itemsResult = await client.query('DELETE FROM order_items');
    console.log(`✅ Deleted ${itemsResult.rowCount} order items`);
    
    // 6. Delete order_bills
    const billsResult = await client.query('DELETE FROM order_bills');
    console.log(`✅ Deleted ${billsResult.rowCount} order bills`);
    
    // 7. Delete orders
    const ordersResult = await client.query('DELETE FROM orders');
    console.log(`✅ Deleted ${ordersResult.rowCount} orders`);
    
    // 8. Reset voucher usage (optional)
    const voucherUsageResult = await client.query('DELETE FROM voucher_usage');
    console.log(`✅ Deleted ${voucherUsageResult.rowCount} voucher usage records`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ All order data cleared successfully!');
    console.log('📊 Database is now clean and ready for new orders.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing order data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearOrdersData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
