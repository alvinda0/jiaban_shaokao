require('dotenv').config();
const OrderService = require('./src/services/order.service');
const { pool } = require('./src/config/db');

(async () => {
  try {
    const order = await pool.query('SELECT id FROM orders WHERE order_number = $1', ['INV-20261117-0001']);
    const orderId = order.rows[0].id;
    
    const bills = await OrderService.getOrderBillsWithDetails(orderId);
    
    console.log('Raw Bills Response:');
    console.log(JSON.stringify(bills, null, 2));
    
  } finally {
    await pool.end();
  }
})();
