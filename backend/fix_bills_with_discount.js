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

async function fixBillsWithDiscount() {
  try {
    console.log('🔧 Recalculating bills with order discount...');

    // Get all bills with their order info
    const billsResult = await pool.query(`
      SELECT 
        ob.*,
        o.subtotal as order_subtotal,
        o.discount_total as order_discount,
        o.order_type
      FROM order_bills ob
      JOIN orders o ON ob.order_id = o.id
      WHERE o.discount_total > 0
      ORDER BY o.order_number, ob.bill_number
    `);

    console.log(`Found ${billsResult.rows.length} bills with order discount\n`);

    for (const bill of billsResult.rows) {
      const orderSubtotal = parseFloat(bill.order_subtotal);
      const orderDiscount = parseFloat(bill.order_discount);
      const billSubtotal = parseFloat(bill.subtotal);
      
      // Calculate discount ratio
      const discountRatio = orderSubtotal > 0 ? orderDiscount / orderSubtotal : 0;
      
      // Calculate bill discount
      const billDiscount = Math.round(billSubtotal * discountRatio);
      const subtotalAfterDiscount = billSubtotal - billDiscount;
      
      // Recalculate SC and PB1
      const SC_RATE = 0.05;
      const PB1_RATE = 0.10;
      
      let sc = 0;
      if (bill.order_type !== 'take_away') {
        sc = Math.round(subtotalAfterDiscount * SC_RATE);
      }
      
      const basePB1 = subtotalAfterDiscount + sc;
      const pb1 = Math.round(basePB1 * PB1_RATE);
      
      const grandTotal = subtotalAfterDiscount + sc + pb1;
      
      console.log(`Bill ${bill.bill_number}:`);
      console.log(`  Subtotal: ${billSubtotal}`);
      console.log(`  Discount: ${billDiscount} (${(discountRatio * 100).toFixed(1)}%)`);
      console.log(`  SC: ${sc}`);
      console.log(`  PB1: ${pb1}`);
      console.log(`  Grand Total: ${grandTotal}`);
      
      // Update bill
      await pool.query(`
        UPDATE order_bills
        SET 
          discount_total = $1,
          service_charge_total = $2,
          tax_total = $3,
          grand_total = $4
        WHERE id = $5
      `, [billDiscount, sc, pb1, grandTotal, bill.id]);
      
      console.log('  ✅ Updated\n');
    }

    console.log('✨ All bills recalculated successfully!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

fixBillsWithDiscount();
