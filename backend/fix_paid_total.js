require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function fixPaidTotal() {
  try {
    console.log('🔧 Fixing paid_total for all orders with split bills...\n');
    
    // Get first store_id
    const storeResult = await pool.query('SELECT id FROM stores LIMIT 1');
    const storeId = storeResult.rows[0].id;
    
    // Get all orders with is_split = true
    const ordersQuery = `
      SELECT id, order_number, grand_total, paid_total, status
      FROM orders
      WHERE store_id = $1 AND is_split = true
      ORDER BY opened_at DESC
    `;
    
    const ordersResult = await pool.query(ordersQuery, [storeId]);
    console.log(`📋 Found ${ordersResult.rows.length} split orders\n`);
    
    for (const order of ordersResult.rows) {
      console.log(`\n🔍 Processing ${order.order_number}...`);
      console.log(`   Current paid_total: ${order.paid_total}`);
      console.log(`   Grand total: ${order.grand_total}`);
      
      // Calculate correct paid_total from payments
      const paymentsQuery = `
        SELECT SUM(amount) as total_paid
        FROM payments
        WHERE order_id = $1 AND status = 'paid'
      `;
      
      const paymentsResult = await pool.query(paymentsQuery, [order.id]);
      const correctPaidTotal = parseFloat(paymentsResult.rows[0].total_paid || 0);
      
      console.log(`   Correct paid_total: ${correctPaidTotal}`);
      
      if (correctPaidTotal !== parseFloat(order.paid_total)) {
        console.log(`   ⚠️  MISMATCH! Updating...`);
        
        // Update order paid_total
        await pool.query(
          `UPDATE orders SET paid_total = $1, updated_at = NOW() WHERE id = $2`,
          [correctPaidTotal, order.id]
        );
        
        console.log(`   ✅ Updated!`);
      } else {
        console.log(`   ✅ Already correct`);
      }
    }
    
    console.log('\n\n✅ All done! Summary:');
    
    // Show today's statistics after fix
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE opened_at >= $2) as total_orders_today,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as active_orders,
        COALESCE(SUM(paid_total) FILTER (WHERE status = 'paid' AND opened_at >= $2), 0) as revenue_today,
        COALESCE(SUM(grand_total) FILTER (WHERE status = 'paid' AND opened_at >= $2), 0) as grand_total_today
      FROM orders
      WHERE store_id = $1
    `;
    
    const statsResult = await pool.query(statsQuery, [storeId, today.toISOString()]);
    const stats = statsResult.rows[0];
    
    console.log('\n📊 Today\'s Statistics (FIXED):');
    console.log(`   Total Orders: ${stats.total_orders_today}`);
    console.log(`   Active Orders: ${stats.active_orders}`);
    console.log(`   Revenue (from paid_total): Rp ${Number(stats.revenue_today).toLocaleString('id-ID')}`);
    console.log(`   Revenue (from grand_total): Rp ${Number(stats.grand_total_today).toLocaleString('id-ID')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPaidTotal();
