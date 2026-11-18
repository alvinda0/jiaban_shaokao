require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function debugSplitBill() {
  try {
    console.log('🔍 Debugging Split Bill Order INV-20261111-0004...\n');
    
    // Get order detail
    const orderQuery = `
      SELECT * FROM orders 
      WHERE order_number = 'INV-20261111-0004'
    `;
    
    const orderResult = await pool.query(orderQuery);
    console.log('📋 Order Detail:');
    console.log(orderResult.rows[0]);
    
    const orderId = orderResult.rows[0].id;
    
    // Get split bills
    console.log('\n🧾 Split Bills (order_bills):');
    const splitQuery = `
      SELECT * FROM order_bills 
      WHERE order_id = $1
      ORDER BY bill_number
    `;
    
    const splitResult = await pool.query(splitQuery, [orderId]);
    console.table(splitResult.rows);
    
    // Get payments for this order
    console.log('\n💳 Payments:');
    const paymentQuery = `
      SELECT 
        p.*,
        ob.bill_number
      FROM payments p
      LEFT JOIN order_bills ob ON p.bill_id = ob.id
      WHERE p.order_id = $1
      ORDER BY p.created_at
    `;
    
    const paymentResult = await pool.query(paymentQuery, [orderId]);
    console.table(paymentResult.rows);
    
    // Sum paid amounts
    console.log('\n💰 Sum Analysis:');
    const sumQuery = `
      SELECT 
        COUNT(*) as payment_count,
        SUM(amount) as total_paid
      FROM payments
      WHERE order_id = $1
    `;
    
    const sumResult = await pool.query(sumQuery, [orderId]);
    console.log(sumResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugSplitBill();
