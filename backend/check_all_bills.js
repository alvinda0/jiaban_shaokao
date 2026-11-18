require('dotenv').config();
const { pool } = require('./src/config/db');

(async () => {
  try {
    const bills = await pool.query(`
      SELECT 
        id, bill_number, subtotal, grand_total, created_at,
        (SELECT COUNT(*) FROM order_bill_items WHERE bill_id = order_bills.id) as item_count
      FROM order_bills 
      WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)
      ORDER BY bill_number
    `, ['INV-20261117-0001']);
    
    console.log('All Bills for Order INV-20261117-0001:');
    bills.rows.forEach(b => {
      console.log(`Bill ${b.bill_number}: subtotal=${b.subtotal}, grand_total=${b.grand_total}, items=${b.item_count}, created=${b.created_at}`);
    });
    
  } finally {
    await pool.end();
  }
})();
