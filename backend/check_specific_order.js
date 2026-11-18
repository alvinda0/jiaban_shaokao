require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function checkOrder() {
  try {
    console.log('🔍 Checking order INV-20261111-0005...\n');
    
    const query = `
      SELECT 
        id,
        order_number,
        status,
        grand_total,
        opened_at,
        closed_at,
        created_at,
        updated_at
      FROM orders
      WHERE order_number = 'INV-20261111-0005'
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Order not found!\n');
    } else {
      const order = result.rows[0];
      console.log('📋 Order Details:');
      console.log(`   Order Number: ${order.order_number}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Grand Total: Rp ${Number(order.grand_total).toLocaleString('id-ID')}`);
      console.log(`   Opened At: ${order.opened_at}`);
      console.log(`   Closed At: ${order.closed_at || 'Not closed'}`);
      console.log(`   Created At: ${order.created_at}`);
      console.log(`   Updated At: ${order.updated_at}`);
      console.log('');
      
      // Check if it appears in list query
      console.log('🔍 Checking if this order appears in list query...\n');
      
      const listQuery = `
        SELECT 
          order_number,
          status,
          opened_at::date as date
        FROM orders
        WHERE store_id = (SELECT store_id FROM orders WHERE order_number = 'INV-20261111-0005')
        ORDER BY opened_at DESC
        LIMIT 20
      `;
      
      const listResult = await pool.query(listQuery);
      console.log(`Found ${listResult.rows.length} orders in list:\n`);
      
      let foundInList = false;
      listResult.rows.forEach((o, i) => {
        if (o.order_number === 'INV-20261111-0005') {
          console.log(`✅ ${i + 1}. ${o.order_number} - ${o.status} - ${o.date} ← THIS ONE`);
          foundInList = true;
        } else {
          console.log(`   ${i + 1}. ${o.order_number} - ${o.status} - ${o.date}`);
        }
      });
      
      if (!foundInList) {
        console.log('\n❌ Order NOT found in list query!');
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOrder();
