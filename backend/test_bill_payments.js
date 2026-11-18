const { pool } = require('./src/config/db');

async function testBillPayments() {
  try {
    console.log('🔍 Checking payments with bill_id...\n');
    
    // Get all payments with bill_id
    const paymentsResult = await pool.query(`
      SELECT p.id, p.order_id, p.bill_id, p.amount, p.status,
             pm.name as payment_method_name, pm.type as payment_method_type
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.bill_id IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${paymentsResult.rows.length} payments with bill_id:\n`);
    paymentsResult.rows.forEach(payment => {
      console.log(`  - Payment ID: ${payment.id}`);
      console.log(`    Order ID: ${payment.order_id}`);
      console.log(`    Bill ID: ${payment.bill_id}`);
      console.log(`    Method: ${payment.payment_method_name} (${payment.payment_method_type})`);
      console.log(`    Amount: ${payment.amount}`);
      console.log(`    Status: ${payment.status}\n`);
    });
    
    // Check bills
    console.log('🔍 Checking bills...\n');
    const billsResult = await pool.query(`
      SELECT id, order_id, bill_number, label, status, grand_total, paid_total
      FROM order_bills
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${billsResult.rows.length} bills:\n`);
    billsResult.rows.forEach(bill => {
      console.log(`  - Bill ID: ${bill.id}`);
      console.log(`    Order ID: ${bill.order_id}`);
      console.log(`    Label: ${bill.label} (#${bill.bill_number})`);
      console.log(`    Status: ${bill.status}`);
      console.log(`    Grand Total: ${bill.grand_total}`);
      console.log(`    Paid Total: ${bill.paid_total}\n`);
    });
    
    await pool.end();
    console.log('✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

testBillPayments();
