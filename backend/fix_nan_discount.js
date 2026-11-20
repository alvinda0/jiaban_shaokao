require('dotenv').config();
const { pool } = require('./src/config/db');

async function fixNaNDiscount() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing NaN discounts in database...\n');

    // Find all NaN discounts
    const findResult = await client.query(
      `SELECT id, order_id, bill_id, name, amount FROM order_discounts 
       WHERE amount::text = 'NaN' OR value::text = 'NaN'`
    );

    console.log(`Found ${findResult.rows.length} records with NaN values`);

    if (findResult.rows.length > 0) {
      findResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Bill: ${row.bill_id}, Amount: ${row.amount}, Name: ${row.name}`);
      });

      // Delete NaN discounts
      const deleteResult = await client.query(
        `DELETE FROM order_discounts 
         WHERE amount::text = 'NaN' OR value::text = 'NaN'`
      );

      console.log(`\n✅ Deleted ${deleteResult.rowCount} records with NaN`);
    }

    // Fix bill totals that have NaN
    const billsResult = await client.query(
      `SELECT id, order_id FROM order_bills 
       WHERE subtotal::text = 'NaN' OR grand_total::text = 'NaN'`
    );

    console.log(`\nFound ${billsResult.rows.length} bills with NaN totals`);

    for (const bill of billsResult.rows) {
      console.log(`\n🔄 Recalculating bill ${bill.id}...`);

      // Get bill items
      const itemsResult = await client.query(
        `SELECT SUM(amount) as subtotal FROM order_bill_items WHERE bill_id = $1`,
        [bill.id]
      );

      const subtotal = Math.round(parseFloat(itemsResult.rows[0].subtotal) || 0);
      console.log(`   Subtotal: ${subtotal}`);

      // Get discounts
      const discountsResult = await client.query(
        `SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as discount_total 
         FROM order_discounts 
         WHERE bill_id = $1 AND amount::text != 'NaN'`,
        [bill.id]
      );

      const discount_total = Math.round(parseFloat(discountsResult.rows[0].discount_total) || 0);
      console.log(`   Discount total: ${discount_total}`);

      // Get order to find tax rules
      const orderResult = await client.query(
        `SELECT o.*, t.number as table_number FROM orders o 
         LEFT JOIN tables t ON o.table_id = t.id
         WHERE o.id = $1`,
        [bill.order_id]
      );

      const order = orderResult.rows[0];
      const amount_after_discount = subtotal - discount_total;

      // Calculate taxes (assume same as order)
      // SC: 5% (dine_in only)
      const service_charge_total = order.order_type !== 'takeaway' ? Math.round((amount_after_discount * 5) / 100) : 0;
      // PB1: 10%
      const base_for_pb1 = amount_after_discount + service_charge_total;
      const tax_total = Math.round((base_for_pb1 * 10) / 100);

      const grand_total = subtotal - discount_total + service_charge_total + tax_total;
      const rounding = Math.round(grand_total) - grand_total;

      console.log(`   Service charge: ${service_charge_total}`);
      console.log(`   Tax total: ${tax_total}`);
      console.log(`   Grand total: ${Math.round(grand_total)}`);

      // Update bill
      await client.query(
        `UPDATE order_bills 
         SET subtotal = $1, discount_total = $2, service_charge_total = $3, 
             tax_total = $4, rounding = $5, grand_total = $6,
             paid_total_updated_at = NOW()
         WHERE id = $7`,
        [subtotal, discount_total, service_charge_total, tax_total, rounding, Math.round(grand_total), bill.id]
      );

      console.log(`   ✅ Bill updated`);
    }

    console.log('\n✅ All NaN values fixed!');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixNaNDiscount();
