require('dotenv').config();
const { pool } = require('./src/config/db');

async function checkOrderTotals() {
  try {
    // Get the most recent order
    const result = await pool.query(
      `SELECT id, order_number, subtotal, discount_total, service_charge_total, 
              tax_total, grand_total, rounding, paid_total, status
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('❌ No orders found');
      process.exit(0);
    }

    const order = result.rows[0];
    console.log('\n📋 Latest Order Totals:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.order_number}`);
    console.log(`Status: ${order.status}`);
    console.log(`\n💰 Totals:`);
    console.log(`  subtotal: ${order.subtotal} (type: ${typeof order.subtotal}, isFinite: ${isFinite(order.subtotal)})`);
    console.log(`  discount_total: ${order.discount_total} (type: ${typeof order.discount_total}, isFinite: ${isFinite(order.discount_total)})`);
    console.log(`  service_charge_total: ${order.service_charge_total} (type: ${typeof order.service_charge_total}, isFinite: ${isFinite(order.service_charge_total)})`);
    console.log(`  tax_total: ${order.tax_total} (type: ${typeof order.tax_total}, isFinite: ${isFinite(order.tax_total)})`);
    console.log(`  grand_total: ${order.grand_total} (type: ${typeof order.grand_total}, isFinite: ${isFinite(order.grand_total)})`);
    console.log(`  rounding: ${order.rounding} (type: ${typeof order.rounding}, isFinite: ${isFinite(order.rounding)})`);
    console.log(`  paid_total: ${order.paid_total} (type: ${typeof order.paid_total}, isFinite: ${isFinite(order.paid_total)})`);

    // Check if any are Infinity or NaN
    const hasBadValues = [
      order.subtotal,
      order.discount_total,
      order.service_charge_total,
      order.tax_total,
      order.grand_total,
      order.rounding,
      order.paid_total
    ].some(v => !isFinite(v));

    if (hasBadValues) {
      console.log('\n⚠️ WARNING: Order has Infinity/NaN values!');
    } else {
      console.log('\n✅ All totals are valid numbers');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkOrderTotals();
