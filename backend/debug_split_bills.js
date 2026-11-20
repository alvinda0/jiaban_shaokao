require('dotenv').config();
const { pool } = require('./src/config/db');

async function debugSplitBills() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking split bills creation...\n');

    // Get latest order
    const orderResult = await client.query(
      `SELECT id, order_number FROM orders ORDER BY created_at DESC LIMIT 1`
    );

    if (orderResult.rows.length === 0) {
      console.log('❌ No orders found');
      return;
    }

    const order = orderResult.rows[0];
    console.log(`📋 Latest order: ${order.order_number} (${order.id})`);

    // Get bills for this order
    const billsResult = await client.query(
      `SELECT id, bill_number, label, subtotal, grand_total FROM order_bills 
       WHERE order_id = $1 
       ORDER BY bill_number`,
      [order.id]
    );

    console.log(`\n📊 Bills created: ${billsResult.rows.length}`);
    billsResult.rows.forEach(bill => {
      console.log(`   Bill ${bill.bill_number}: ${bill.label} - Subtotal: ${bill.subtotal}, Grand Total: ${bill.grand_total}`);
    });

    // Check bill items
    console.log('\n📦 Bill items:');
    for (const bill of billsResult.rows) {
      const itemsResult = await client.query(
        `SELECT obi.id, obi.qty, obi.amount, oi.product_name
         FROM order_bill_items obi
         LEFT JOIN order_items oi ON obi.order_item_id = oi.id
         WHERE obi.bill_id = $1`,
        [bill.id]
      );

      if (itemsResult.rows.length === 0) {
        console.log(`   Bill ${bill.bill_number}: NO ITEMS (❌ EMPTY!)`);
      } else {
        console.log(`   Bill ${bill.bill_number}:`);
        itemsResult.rows.forEach(item => {
          console.log(`      - ${item.product_name}: qty=${item.qty}, amount=${item.amount}`);
        });
      }
    }

    // Check order items
    console.log('\n📋 Order items:');
    const orderItemsResult = await client.query(
      `SELECT id, product_name, qty, line_total FROM order_items WHERE order_id = $1`,
      [order.id]
    );

    orderItemsResult.rows.forEach(item => {
      console.log(`   - ${item.product_name}: qty=${item.qty}, total=${item.line_total}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

debugSplitBills();
