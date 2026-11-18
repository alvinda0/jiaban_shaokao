require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

const ORDER_NUMBER = 'INV-20261111-0005';

async function deleteOrder() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🗑️  Deleting order: ${ORDER_NUMBER}\n`);
    
    // Get order ID first
    const orderResult = await client.query(
      'SELECT id, order_number, status, grand_total FROM orders WHERE order_number = $1',
      [ORDER_NUMBER]
    );
    
    if (orderResult.rows.length === 0) {
      console.log('❌ Order not found!\n');
      await client.query('ROLLBACK');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log('📋 Order found:');
    console.log(`   ID: ${order.id}`);
    console.log(`   Number: ${order.order_number}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Grand Total: Rp ${Number(order.grand_total).toLocaleString('id-ID')}\n`);
    
    const orderId = order.id;
    
    // Delete related records in order
    console.log('🗑️  Deleting related records...\n');
    
    // 1. Delete order_item_variants
    const variantsResult = await client.query(
      'DELETE FROM order_item_variants WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)',
      [orderId]
    );
    console.log(`   ✓ Deleted ${variantsResult.rowCount} order item variants`);
    
    // 2. Delete order_items
    const itemsResult = await client.query(
      'DELETE FROM order_items WHERE order_id = $1',
      [orderId]
    );
    console.log(`   ✓ Deleted ${itemsResult.rowCount} order items`);
    
    // 3. Delete payments
    const paymentsResult = await client.query(
      'DELETE FROM payments WHERE order_id = $1',
      [orderId]
    );
    console.log(`   ✓ Deleted ${paymentsResult.rowCount} payments`);
    
    // 4. Delete order_discounts
    const discountsResult = await client.query(
      'DELETE FROM order_discounts WHERE order_id = $1',
      [orderId]
    );
    console.log(`   ✓ Deleted ${discountsResult.rowCount} order discounts`);
    
    // 5. Delete order_taxes
    const taxesResult = await client.query(
      'DELETE FROM order_taxes WHERE order_id = $1',
      [orderId]
    );
    console.log(`   ✓ Deleted ${taxesResult.rowCount} order taxes`);
    
    // 6. Delete split bills if exists
    const billsCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'split_bills')"
    );
    
    if (billsCheck.rows[0].exists) {
      const billsResult = await client.query(
        'DELETE FROM split_bills WHERE order_id = $1',
        [orderId]
      );
      console.log(`   ✓ Deleted ${billsResult.rowCount} split bills`);
    } else {
      console.log(`   - Split bills table not found (skipped)`);
    }
    
    // 7. Finally, delete the order itself
    const orderDeleteResult = await client.query(
      'DELETE FROM orders WHERE id = $1',
      [orderId]
    );
    console.log(`   ✓ Deleted the order\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ Order successfully deleted!\n');
    console.log('Stats should now show:');
    console.log('   - Total Orders Today: 1');
    console.log('   - Revenue Today: Rp 57.750\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Transaction rolled back - no changes made\n');
  } finally {
    client.release();
    await pool.end();
  }
}

deleteOrder();
