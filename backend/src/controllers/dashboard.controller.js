const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

const getDashboardData = async (req, res) => {
  try {
    const { store_id } = req.params;
    
    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }

    // Get current date info
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Today's summary
    const todayQuery = `
      SELECT 
        COUNT(*) as order_count,
        SUM(grand_total) as total_revenue,
        SUM(subtotal) as subtotal,
        SUM(discount_total) as discount_total,
        SUM(service_charge_total) as service_charge,
        SUM(tax_total) as tax_total
      FROM orders
      WHERE store_id = $1 
        AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
        AND status != 'void'
    `;

    // 2. Weekly revenue by day
    const weeklyQuery = `
      SELECT 
        DATE(opened_at AT TIME ZONE 'Asia/Jakarta') as date,
        EXTRACT(DOW FROM opened_at AT TIME ZONE 'Asia/Jakarta') as day_of_week,
        COUNT(*) as order_count,
        SUM(grand_total) as total_revenue,
        SUM(subtotal) as subtotal,
        SUM(discount_total) as discount_total,
        SUM(service_charge_total) as service_charge,
        SUM(tax_total) as tax_total
      FROM orders
      WHERE store_id = $1 
        AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') >= (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')
        AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
        AND status != 'void'
      GROUP BY DATE(opened_at AT TIME ZONE 'Asia/Jakarta'), EXTRACT(DOW FROM opened_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY DATE(opened_at AT TIME ZONE 'Asia/Jakarta')
    `;

    // 3. Month summary
    const monthQuery = `
      SELECT 
        COUNT(*) as order_count,
        SUM(grand_total) as total_revenue,
        SUM(subtotal) as subtotal,
        SUM(discount_total) as discount_total,
        SUM(service_charge_total) as service_charge,
        SUM(tax_total) as tax_total
      FROM orders
      WHERE store_id = $1 
        AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') >= $2::date
        AND DATE(opened_at AT TIME ZONE 'Asia/Jakarta') < (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta') + INTERVAL '1 day')
        AND status != 'void'
    `;

    // 4. Top 5 products - dengan LEFT JOIN
    const topProductsQuery = `
      SELECT 
        COALESCE(p.id, NULL) as id,
        COALESCE(p.name, 'N/A') as name,
        COALESCE(SUM(oi.qty), 0) as qty_sold,
        COALESCE(SUM(oi.line_total), 0) as sales_value,
        COALESCE(ROUND(AVG(p.cost_price), 2), 0) as avg_cost_price,
        COALESCE(ROUND(SUM(oi.qty) * AVG(p.cost_price), 2), 0) as total_cogs,
        COALESCE(ROUND(SUM(oi.line_total) - (SUM(oi.qty) * AVG(p.cost_price)), 2), 0) as margin
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.status != 'void'
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.store_id = $1 
        AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')
        AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
        AND o.status != 'void'
      GROUP BY p.id, p.name
      HAVING SUM(oi.qty) > 0
      ORDER BY qty_sold DESC
      LIMIT 5
    `;

    // 5. Payment methods breakdown (today)
    const paymentMethodsQuery = `
      SELECT 
        pm.name,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount
      FROM payments p
      JOIN payment_methods pm ON p.payment_method_id = pm.id
      JOIN orders o ON p.order_id = o.id
      WHERE o.store_id = $1 
        AND DATE(p.paid_at) = CURRENT_DATE
        AND p.status = 'paid'
      GROUP BY pm.id, pm.name
      ORDER BY total_amount DESC
    `;

    // 6. Top products by day (for weekly breakdown) - dengan LEFT JOIN
    const topProductsByDayQuery = `
      SELECT 
        DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') as date,
        EXTRACT(DOW FROM o.opened_at AT TIME ZONE 'Asia/Jakarta') as day_of_week,
        COALESCE(p.id, NULL) as id,
        COALESCE(p.name, 'N/A') as product_name,
        COALESCE(SUM(oi.qty), 0) as qty_sold,
        COALESCE(SUM(oi.line_total), 0) as sales_value
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.status != 'void'
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.store_id = $1 
        AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta') - INTERVAL '7 days')
        AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
        AND o.status != 'void'
      GROUP BY DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta'), EXTRACT(DOW FROM o.opened_at AT TIME ZONE 'Asia/Jakarta'), p.id, p.name
      ORDER BY DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta'), qty_sold DESC
    `;

    // 7. Total Stores count (for superuser only)
    const totalStoresQuery = `
      SELECT COUNT(*) as total_stores
      FROM stores
    `;

    // 8. Total Users count
    const totalUsersQuery = `
      SELECT COUNT(*) as total_users
      FROM users
    `;

    // 9. Total Menu Products count for this store
    const totalMenuQuery = `
      SELECT COUNT(*) as total_menu
      FROM products
      WHERE store_id = $1
    `;

    // Execute queries in parallel
    const [
      todayRes,
      weeklyRes,
      monthRes,
      topProductsRes,
      paymentMethodsRes,
      topProductsByDayRes,
      totalStoresRes,
      totalUsersRes,
      totalMenuRes
    ] = await Promise.all([
      pool.query(todayQuery, [store_id]),
      pool.query(weeklyQuery, [store_id]),
      pool.query(monthQuery, [store_id, monthAgo.toISOString().split('T')[0]]),
      pool.query(topProductsQuery, [store_id]),
      pool.query(paymentMethodsQuery, [store_id]),
      pool.query(topProductsByDayQuery, [store_id]),
      pool.query(totalStoresQuery),
      pool.query(totalUsersQuery),
      pool.query(totalMenuQuery, [store_id])
    ]);

    // Format day names
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    const weeklyData = weeklyRes.rows.map(row => ({
      date: row.date,
      day: dayNames[parseInt(row.day_of_week)],
      order_count: parseInt(row.order_count),
      revenue: parseFloat(row.total_revenue) || 0,
      subtotal: parseFloat(row.subtotal) || 0,
      discount: parseFloat(row.discount_total) || 0,
      service_charge: parseFloat(row.service_charge) || 0,
      tax: parseFloat(row.tax_total) || 0
    }));

    // Group top products by day
    const topProductsByDay = {};
    topProductsByDayRes.rows.forEach(row => {
      const date = row.date;
      if (!topProductsByDay[date]) {
        topProductsByDay[date] = {
          date: row.date,
          day: dayNames[parseInt(row.day_of_week)],
          products: []
        };
      }
      // Limit to top 3 per day
      if (topProductsByDay[date].products.length < 3) {
        topProductsByDay[date].products.push({
          id: row.id,
          name: row.product_name,
          qty_sold: parseInt(row.qty_sold),
          sales_value: parseFloat(row.sales_value) || 0
        });
      }
    });

    const topProductsDailyData = Object.values(topProductsByDay);

    const dashboardData = {
      today: {
        order_count: parseInt(todayRes.rows[0]?.order_count) || 0,
        total_revenue: parseFloat(todayRes.rows[0]?.total_revenue) || 0,
        subtotal: parseFloat(todayRes.rows[0]?.subtotal) || 0,
        discount_total: parseFloat(todayRes.rows[0]?.discount_total) || 0,
        service_charge: parseFloat(todayRes.rows[0]?.service_charge) || 0,
        tax_total: parseFloat(todayRes.rows[0]?.tax_total) || 0
      },
      this_month: {
        order_count: parseInt(monthRes.rows[0]?.order_count) || 0,
        total_revenue: parseFloat(monthRes.rows[0]?.total_revenue) || 0,
        subtotal: parseFloat(monthRes.rows[0]?.subtotal) || 0,
        discount_total: parseFloat(monthRes.rows[0]?.discount_total) || 0,
        service_charge: parseFloat(monthRes.rows[0]?.service_charge) || 0,
        tax_total: parseFloat(monthRes.rows[0]?.tax_total) || 0
      },
      counts: {
        total_stores: parseInt(totalStoresRes.rows[0]?.total_stores) || 0,
        total_users: parseInt(totalUsersRes.rows[0]?.total_users) || 0,
        total_menu: parseInt(totalMenuRes.rows[0]?.total_menu) || 0
      },
      weekly_chart: weeklyData,
      top_products: topProductsRes.rows.map(row => ({
        id: row.id,
        name: row.name,
        qty_sold: parseInt(row.qty_sold),
        sales_value: parseFloat(row.sales_value),
        avg_cost_price: parseFloat(row.avg_cost_price),
        total_cogs: parseFloat(row.total_cogs),
        margin: parseFloat(row.margin)
      })),
      top_products_daily: topProductsDailyData,
      payment_methods: paymentMethodsRes.rows.map(row => ({
        name: row.name,
        transaction_count: parseInt(row.transaction_count),
        total_amount: parseFloat(row.total_amount)
      }))
    };

    return success(res, dashboardData, 'Dashboard data retrieved successfully');
  } catch (err) {
    console.error('Dashboard error:', err);
    return error(res, err.message, 500);
  }
};

module.exports = { getDashboardData };
