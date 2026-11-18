require('dotenv').config();
const { pool } = require('./src/config/db');

async function debugSplitItems() {
  try {
    console.log('🔍 Debugging split items...\n');
    
    // Get the order
    const orderResult = await pool.query(`
      SELECT id, order_number
      FROM orders
      WHERE order_number = 'INV-20261117-0001'
    `);
    
    if (orderResult.rows.length === 0) {
      console.log('❌ Order not found');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log('📋 Order:', order);
    
    // Get all order items
    console.log('\n📦 Order Items (all):');
    const itemsResult = await pool.query(`
      SELECT id, product_name, qty, unit_price
      FROM order_items
      WHERE order_id = $1
      ORDER BY created_at
    `, [order.id]);
    console.table(itemsResult.rows);
    
    // Get all bill items
    console.log('\n💳 Bill Items (all):');
    const billItemsResult = await pool.query(`
      SELECT 
        obi.id,
        obi.order_item_id,
        obi.qty,
        ob.bill_number,
        oi.product_name
      FROM order_bill_items obi
      JOIN order_bills ob ON obi.bill_id = ob.id
      JOIN order_items oi ON obi.order_item_id = oi.id
      WHERE ob.order_id = $1
      ORDER BY ob.bill_number, obi.order_item_id
    `, [order.id]);
    console.table(billItemsResult.rows);
    
    // Check for mismatches
    console.log('\n🔍 Analysis:');
    const orderItems = itemsResult.rows;
    const billItems = billItemsResult.rows;
    
    console.log(`Total order items: ${orderItems.length}`);
    console.log(`Total bill items: ${billItems.length}`);
    
    orderItems.forEach((item, idx) => {
      const billItem = billItems.find(bi => bi.order_item_id === item.id);
      if (billItem) {
        console.log(`✓ Item ${idx + 1} (${item.product_name}): → Bill ${billItem.bill_number}`);
      } else {
        console.log(`✗ Item ${idx + 1} (${item.product_name}): NOT IN ANY BILL`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugSplitItems();
