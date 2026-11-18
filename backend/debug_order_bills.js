require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function debugBills() {
  try {
    console.log('🔍 Debugging order bills for INV-20261117-0001...\n');
    
    // Get the order
    const orderResult = await pool.query(`
      SELECT id, order_number, subtotal, discount_total
      FROM orders
      WHERE order_number = 'INV-20261117-0001'
    `);
    
    if (orderResult.rows.length === 0) {
      console.log('❌ Order not found');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log('📋 Order:', order);
    
    // Get items in order
    const itemsResult = await pool.query(`
      SELECT id, product_name, qty, unit_price, line_total
      FROM order_items
      WHERE order_id = $1 AND status != 'void'
    `, [order.id]);
    
    console.log('\n📦 Order items:');
    console.table(itemsResult.rows);
    
    // Get bills
    const billsResult = await pool.query(`
      SELECT id, bill_number, subtotal, discount_total, service_charge_total, tax_total, grand_total, split_method
      FROM order_bills
      WHERE order_id = $1
      ORDER BY bill_number
    `, [order.id]);
    
    console.log('\n💳 Order bills:');
    console.table(billsResult.rows);
    
    // Get bill items
    const billItemsResult = await pool.query(`
      SELECT obi.id, obi.bill_id, obi.order_item_id, obi.qty, obi.unit_price, obi.line_total,
             ob.bill_number
      FROM order_bill_items obi
      JOIN order_bills ob ON obi.bill_id = ob.id
      WHERE ob.order_id = $1
      ORDER BY ob.bill_number, obi.order_item_id
    `, [order.id]);
    
    console.log('\n📋 Bill items:');
    if (billItemsResult.rows.length === 0) {
      console.log('❌ NO BILL ITEMS FOUND! This is the problem!');
    } else {
      console.table(billItemsResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugBills();
