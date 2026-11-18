require('dotenv').config();
const { pool } = require('./src/config/db');

async function verify() {
  try {
    console.log('🔍 Verifying unit_price is returned from getBillItems query...\n');
    
    // Get the first bill
    const billResult = await pool.query('SELECT id FROM order_bills LIMIT 1');
    
    if (billResult.rows.length === 0) {
      console.log('No bills found');
      return;
    }
    
    const billId = billResult.rows[0].id;
    console.log('Bill ID:', billId);
    
    // Run the query as it would be called from getBillItems
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
    `, [billId]);
    
    console.log('\nQuery Result:');
    console.log(JSON.stringify(itemsResult.rows, null, 2));
    
    // Simulate the transformation as done in getOrderBills controller
    console.log('\nAfter Controller Transformation:');
    const transformed = itemsResult.rows.map(item => ({
      order_detail_id: item.order_item_id,
      quantity: item.qty,
      unit_price: item.unit_price || item.calculated_unit_price || 0,
      total_price: item.amount,
    }));
    console.log(JSON.stringify(transformed, null, 2));
    
    // Verify unit_price is not 0
    const hasValidPrices = transformed.every(item => item.unit_price > 0);
    if (hasValidPrices) {
      console.log('\n✅ All items have valid unit_price values');
    } else {
      console.log('\n❌ Some items have 0 unit_price');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
