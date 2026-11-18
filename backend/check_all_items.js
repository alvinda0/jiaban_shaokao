require('dotenv').config();
const { pool } = require('./src/config/db');

(async () => {
  try {
    const result = await pool.query('SELECT id, product_name, qty FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_number = $1) ORDER BY created_at', ['INV-20261117-0001']);
    console.log('Total order items:', result.rows.length);
    result.rows.forEach((r, i) => console.log(`${i+1}. ${r.product_name} x${r.qty} (id: ${r.id.substring(0,8)}...)`));
  } finally {
    await pool.end();
  }
})();
