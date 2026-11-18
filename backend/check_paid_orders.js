const { pool } = require('./src/config/db');

async function checkPaidOrders() {
  try {
    const result = await pool.query(`
      SELECT order_number, status, is_split 
      FROM orders 
      WHERE status = 'paid' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('Paid orders:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPaidOrders();
