require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function debugOmset() {
  try {
    console.log('🔍 Debugging Omset Hari Ini...\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('📅 Today start:', today.toISOString());
    
    // Get first store_id
    const storeResult = await pool.query('SELECT id FROM stores LIMIT 1');
    const storeId = storeResult.rows[0].id;
    console.log('🏪 Store ID:', storeId);
    
    // Current query (yang bermasalah)
    const currentQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE opened_at >= $2) as total_orders_today,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as active_orders,
        COALESCE(SUM(paid_total) FILTER (WHERE status = 'paid' AND opened_at >= $2), 0) as revenue_today
      FROM orders
      WHERE store_id = $1
    `;
    
    console.log('\n📊 Current Query Result:');
    const currentResult = await pool.query(currentQuery, [storeId, today.toISOString()]);
    console.log(currentResult.rows[0]);
    
    // Detail orders hari ini
    console.log('\n📋 Orders Hari Ini (status = paid):');
    const detailQuery = `
      SELECT 
        order_number,
        status,
        grand_total,
        paid_total,
        opened_at::date as date,
        opened_at
      FROM orders
      WHERE store_id = $1 
        AND opened_at >= $2
        AND status = 'paid'
      ORDER BY opened_at DESC
      LIMIT 10
    `;
    
    const detailResult = await pool.query(detailQuery, [storeId, today.toISOString()]);
    console.table(detailResult.rows);
    
    // Sum manual
    console.log('\n💰 Manual Sum Check:');
    const sumQuery = `
      SELECT 
        COUNT(*) as total_paid_orders,
        SUM(grand_total) as total_grand_total,
        SUM(paid_total) as total_paid_total
      FROM orders
      WHERE store_id = $1 
        AND opened_at >= $2
        AND status = 'paid'
    `;
    
    const sumResult = await pool.query(sumQuery, [storeId, today.toISOString()]);
    console.log(sumResult.rows[0]);
    
    // Check all orders today (termasuk status lain)
    console.log('\n📊 All Orders Today (by status):');
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(grand_total) as sum_grand_total,
        SUM(paid_total) as sum_paid_total
      FROM orders
      WHERE store_id = $1 
        AND opened_at >= $2
      GROUP BY status
    `;
    
    const statusResult = await pool.query(statusQuery, [storeId, today.toISOString()]);
    console.table(statusResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugOmset();
