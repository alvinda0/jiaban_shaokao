require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function testStatistics() {
  try {
    console.log('🔍 Testing today statistics query...\n');
    
    // Get store_id first
    const storeResult = await pool.query('SELECT id, name FROM stores LIMIT 1');
    if (storeResult.rows.length === 0) {
      console.log('❌ No stores found!');
      process.exit(1);
    }
    
    const store = storeResult.rows[0];
    console.log(`📍 Using store: ${store.name} (${store.id})\n`);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log(`📅 Today start: ${today.toISOString()}\n`);
    
    // Test the statistics query with CURRENT_DATE
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE opened_at::date = CURRENT_DATE) as total_orders_today,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as active_orders,
        COALESCE(SUM(grand_total) FILTER (WHERE status = 'paid' AND opened_at::date = CURRENT_DATE), 0) as revenue_today,
        CURRENT_DATE as server_date
      FROM orders
      WHERE store_id = $1
    `;
    
    console.log('Running query...\n');
    const result = await pool.query(query, [store.id]);
    const stats = result.rows[0];
    
    console.log('📊 Statistics Result:');
    console.log(`   Server Date: ${stats.server_date}`);
    console.log(`   Total Orders Today: ${stats.total_orders_today}`);
    console.log(`   Active Orders: ${stats.active_orders}`);
    console.log(`   Revenue Today: Rp ${Number(stats.revenue_today).toLocaleString('id-ID')}\n`);
    
    // Check all orders for debugging
    const allOrdersQuery = `
      SELECT 
        order_number,
        status,
        grand_total,
        opened_at,
        opened_at::date as opened_date,
        closed_at
      FROM orders
      WHERE store_id = $1
      ORDER BY opened_at DESC
      LIMIT 10
    `;
    
    const ordersResult = await pool.query(allOrdersQuery, [store.id]);
    console.log('📋 Recent Orders:');
    ordersResult.rows.forEach((order, i) => {
      console.log(`\n${i + 1}. Order: ${order.order_number}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Grand Total: Rp ${Number(order.grand_total).toLocaleString('id-ID')}`);
      console.log(`   Opened: ${order.opened_at}`);
      console.log(`   Opened Date: ${order.opened_date}`);
      console.log(`   Closed: ${order.closed_at || 'Not closed'}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testStatistics();
