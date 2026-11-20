require('dotenv').config();
const { pool } = require('./src/config/db');

async function debugBillNaN() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking Bill 3 (d1e25a69-bfdf-4de1-8af0-ea5a6bd8789f)\n');

    // Get bill
    const billResult = await client.query(
      'SELECT * FROM order_bills WHERE id = $1',
      ['d1e25a69-bfdf-4de1-8af0-ea5a6bd8789f']
    );

    if (billResult.rows.length === 0) {
      console.log('❌ Bill not found');
      return;
    }

    const bill = billResult.rows[0];
    console.log('📋 Bill data:');
    console.log(JSON.stringify(bill, null, 2));

    // Get bill items
    console.log('\n📦 Bill items:');
    const itemsResult = await client.query(
      `SELECT 
        obi.id,
        obi.bill_id,
        obi.order_item_id,
        obi.qty,
        obi.amount,
        oi.product_name,
        oi.unit_price
       FROM order_bill_items obi
       LEFT JOIN order_items oi ON obi.order_item_id = oi.id
       WHERE obi.bill_id = $1`,
      ['d1e25a69-bfdf-4de1-8af0-ea5a6bd8789f']
    );

    itemsResult.rows.forEach(item => {
      console.log(`  - ${item.product_name}: qty=${item.qty}, amount=${item.amount}`);
    });

    // Calculate subtotal
    let subtotal = 0;
    for (const item of itemsResult.rows) {
      const amount = parseFloat(item.amount);
      console.log(`     Parsing amount: "${item.amount}" => ${amount}`);
      subtotal += amount || 0;
    }
    console.log(`\nSubtotal calculation: ${subtotal}`);
    console.log(`Rounded: ${Math.round(subtotal)}`);

    // Get discounts for this bill
    console.log('\n💰 Discounts for this bill:');
    const discountsResult = await client.query(
      `SELECT * FROM order_discounts 
       WHERE bill_id = $1
       ORDER BY created_at DESC`,
      ['d1e25a69-bfdf-4de1-8af0-ea5a6bd8789f']
    );

    if (discountsResult.rows.length === 0) {
      console.log('  (No bill-specific discounts)');
    } else {
      discountsResult.rows.forEach(d => {
        console.log(`  - ${d.name}: amount=${d.amount} (${typeof d.amount})`);
      });

      let discount_total = 0;
      for (const d of discountsResult.rows) {
        const amount = parseFloat(d.amount);
        console.log(`     Parsing discount: "${d.amount}" => ${amount}`);
        discount_total += amount || 0;
      }
      console.log(`  Discount total: ${discount_total}`);
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

debugBillNaN();
