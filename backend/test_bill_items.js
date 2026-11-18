require('dotenv').config();
const { pool } = require('./src/config/db');

async function testBillItems() {
  try {
    console.log('🧪 Testing Bill Items with Unit Price...\n');
    
    // Get a bill
    const billResult = await pool.query(`
      SELECT id, bill_number, subtotal, grand_total
      FROM order_bills
      LIMIT 1
    `);
    
    if (billResult.rows.length === 0) {
      console.log('❌ No bills found');
      return;
    }
    
    const bill = billResult.rows[0];
    console.log('📋 Bill:', bill);
    
    // Get bill items with new query
    const itemsResult = await pool.query(`
      SELECT 
        obi.id,
        obi.bill_id,
        obi.order_item_id,
        obi.qty,
        obi.amount,
        oi.product_name,
        oi.unit_price,
        CASE 
          WHEN obi.qty > 0 THEN obi.amount / obi.qty 
          ELSE 0 
        END as calculated_unit_price
       FROM order_bill_items obi
       LEFT JOIN order_items oi ON obi.order_item_id = oi.id
       WHERE obi.bill_id = $1
    `, [bill.id]);
    
    console.log('\n📦 Bill Items:');
    console.table(itemsResult.rows);
    
    console.log('\n✅ Item data with unit prices:');
    itemsResult.rows.forEach(item => {
      const unitPrice = item.unit_price || item.calculated_unit_price || 0;
      console.log(`  - ${item.product_name}: qty=${item.qty}, unit_price=${unitPrice}, amount=${item.amount}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testBillItems();
