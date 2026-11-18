require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function checkTodayOrders() {
  try {
    console.log('🔍 Checking TODAY\'s orders in database...\n');
    
    // Get store_id
    const storeResult = await pool.query('SELECT id, name FROM stores LIMIT 1');
    const store = storeResult.rows[0];
    console.log(`📍 Store: ${store.name} (${store.id})\n`);
    
    // Check server date
    const dateResult = await pool.query('SELECT CURRENT_DATE as today, NOW() as now');
    console.log(`📅 Server Date: ${dateResult.rows[0].today}`);
    console.log(`🕐 Server Time: ${dateResult.rows[0].now}\n`);
    
    // Get today's orders
    const query = `
      SELECT 
        order_number,
        status,
        grand_total,
        opened_at,
        opened_at::date as opened_date
      FROM orders
      WHERE store_id = $1 
        AND opened_at::date = CURRENT_DATE
      ORDER BY opened_at DESC
    `;
    
    const result = await pool.query(query, [store.id]);
    
    if (result.rows.length === 0) {
      console.log('❌ No orders found for TODAY!\n');
    } else {
      console.log(`✅ Found ${result.rows.length} order(s) TODAY:\n`);
      
      let totalRevenue = 0;
      result.rows.forEach((order, i) => {
        console.log(`${i + 1}. ${order.order_number}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Grand Total: Rp ${Number(order.grand_total).toLocaleString('id-ID')}`);
        console.log(`   Opened: ${order.opened_at}`);
        console.log('');
        
        if (order.status === 'paid') {
          totalRevenue += Number(order.grand_total);
        }
      });
      
      console.log(`💰 Total Revenue (paid only): Rp ${totalRevenue.toLocaleString('id-ID')}\n`);
    }
    
    // Also check yesterday's data
    console.log('📊 Yesterday\'s orders:');
    const yesterdayQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
      FROM orders
      WHERE store_id = $1 
        AND opened_at::date = CURRENT_DATE - INTERVAL '1 day'
        AND status = 'paid'
    `;
    
    const yesterdayResult = await pool.query(yesterdayQuery, [store.id]);
    console.log(`   Orders: ${yesterdayResult.rows[0].count}`);
    console.log(`   Revenue: Rp ${Number(yesterdayResult.rows[0].total).toLocaleString('id-ID')}\n`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTodayOrders();
