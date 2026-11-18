require('dotenv').config();
const { pool } = require('./src/config/db');

async function verify() {
  try {
    console.log('🔍 Verifying transformed response...\n');
    
    // Get the first bill
    const billResult = await pool.query(`
      SELECT 
        id, bill_number, subtotal, discount_total, service_charge_total, 
        tax_total, grand_total
      FROM order_bills 
      LIMIT 1
    `);
    
    if (billResult.rows.length === 0) {
      console.log('No bills found');
      return;
    }
    
    const bill = billResult.rows[0];
    const billId = bill.id;
    
    // Get bill items
    const itemsResult = await pool.query(`
      SELECT 
        obi.id, obi.bill_id, obi.order_item_id, obi.qty, obi.amount,
        oi.product_name, oi.unit_price,
        CASE 
          WHEN obi.qty > 0 THEN obi.amount / obi.qty 
          ELSE 0 
        END as calculated_unit_price
       FROM order_bill_items obi
       LEFT JOIN order_items oi ON obi.order_item_id = oi.id
       WHERE obi.bill_id = $1
    `, [billId]);
    
    // Simulate controller transformation
    const transformedBill = {
      ...bill,
      subtotal: parseInt(bill.subtotal),
      discount_total: parseInt(bill.discount_total),
      service_charge_total: parseInt(bill.service_charge_total),
      tax_total: parseInt(bill.tax_total),
      grand_total: parseInt(bill.grand_total),
      amount: parseInt(bill.grand_total),
      paid_amount: parseInt(bill.paid_amount || bill.paid_total || 0),
      items: itemsResult.rows.map(item => ({
        order_detail_id: item.order_item_id,
        quantity: parseInt(item.qty),
        unit_price: parseInt(item.unit_price || item.calculated_unit_price || 0),
        total_price: parseInt(item.amount),
      })),
    };
    
    console.log('Transformed Response:');
    console.log(JSON.stringify(transformedBill, null, 2));
    
    // Verify each item price
    console.log('\n✅ Item Verification:');
    transformedBill.items.forEach((item, idx) => {
      console.log(`Item ${idx + 1}:`);
      console.log(`  - quantity: ${item.quantity}`);
      console.log(`  - unit_price: ${item.unit_price}`);
      console.log(`  - calculated amount: ${item.quantity} × ${item.unit_price} = ${item.quantity * item.unit_price}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
