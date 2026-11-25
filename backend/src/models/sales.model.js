const { pool } = require('../config/db');

class SalesModel {
  /**
   * Get comprehensive sales report
   * Includes: products sold, discounts, taxes, service charges, payment methods
   */
  static async getSalesReport(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to } = filters;

    // Build date-time filter
    // Use opened_at for filtering (more reliable than closed_at which may be null)
    // Add timezone adjustment for Jakarta time
    let dateFilter = `DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    // If time filter is provided, combine with date
    if (time_from && time_to) {
      dateFilter = `
        (
          DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND 
          DATE(o.opened_at AT TIME ZONE 'Asia/Jakarta') <= $3::date
        )
        AND
        (CAST(o.opened_at AT TIME ZONE 'Asia/Jakarta' AS TIME) >= $${paramIndex}::time AND
         CAST(o.opened_at AT TIME ZONE 'Asia/Jakarta' AS TIME) <= $${paramIndex + 1}::time)
      `;
      params.push(time_from, time_to);
      paramIndex += 2;
    }

    console.log('📊 Sales Report Query:');
    console.log('   Store ID:', store_id);
    console.log('   Date From:', date_from);
    console.log('   Date To:', date_to);
    console.log('   Time From:', time_from);
    console.log('   Time To:', time_to);
    console.log('   Full params:', params);

    // Get products sold
    // Include orders where paid_total > 0 (meaning at least partially paid)
    const productsQuery = `
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.qty) as total_qty,
        oi.unit_price,
        SUM(oi.line_total) as subtotal,
        SUM(oi.discount_amount) as item_discount
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.store_id = $1 
        AND o.paid_total > 0
        AND oi.status != 'void'
        AND ${dateFilter}
      GROUP BY oi.product_id, oi.product_name, oi.unit_price
      ORDER BY oi.product_name ASC
    `;

    console.log('📦 Products Query:', productsQuery);
    console.log('   with params:', params);

    const productsResult = await pool.query(productsQuery, params);

    // Get discount breakdown by type
    const discountsQuery = `
      SELECT 
        od.name as discount_name,
        od.type,
        od.applied_stage,
        SUM(od.amount) as total_amount,
        COUNT(DISTINCT o.id) as usage_count
      FROM order_discounts od
      INNER JOIN orders o ON od.order_id = o.id
      WHERE o.store_id = $1 
        AND o.paid_total > 0
        AND ${dateFilter}
      GROUP BY od.name, od.type, od.applied_stage
      ORDER BY total_amount DESC
    `;

    const discountsResult = await pool.query(discountsQuery, params);

    // Get payment method breakdown
    const paymentsQuery = `
      SELECT 
        pm.name as payment_method,
        pm.type as payment_type,
        COUNT(DISTINCT p.order_id) as transaction_count,
        SUM(p.amount) as total_amount
      FROM payments p
      INNER JOIN payment_methods pm ON p.payment_method_id = pm.id
      INNER JOIN orders o ON p.order_id = o.id
      WHERE o.store_id = $1 
        AND p.status = 'paid'
        AND ${dateFilter}
      GROUP BY pm.name, pm.type
      ORDER BY total_amount DESC
    `;

    const paymentsResult = await pool.query(paymentsQuery, params);

    // Get overall summary
    // Note: Calculate discount from order_discounts table since order.discount_total may not be updated
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.subtotal) as total_subtotal,
        COALESCE(SUM(od.amount), 0) as total_discount,
        SUM(o.service_charge_total) as total_service_charge,
        SUM(o.tax_total) as total_tax,
        SUM(o.rounding) as total_rounding,
        SUM(o.grand_total) as total_grand_total,
        AVG(o.grand_total) as avg_order_value,
        COALESCE(SUM(DISTINCT o.complimentary_amount), 0) as total_complimentary
      FROM orders o
      LEFT JOIN order_discounts od ON o.id = od.order_id
      WHERE o.store_id = $1 
        AND o.paid_total > 0
        AND ${dateFilter}
    `;

    const summaryResult = await pool.query(summaryQuery, params);
    
    console.log('📊 Query Results:');
    console.log('   Summary:', summaryResult.rows[0]);
    console.log('   Products:', productsResult.rows.length);
    console.log('   Discounts:', discountsResult.rows.length);
    console.log('   Payments:', paymentsResult.rows.length);

    // Get tax breakdown (PB1 details)
    const taxesQuery = `
      SELECT 
        ot.code as tax_code,
        ot.rate as tax_rate,
        SUM(ot.base_amount) as total_base,
        SUM(ot.amount) as total_tax
      FROM order_taxes ot
      INNER JOIN orders o ON ot.order_id = o.id
      WHERE o.store_id = $1 
        AND o.paid_total > 0
        AND ${dateFilter}
      GROUP BY ot.code, ot.rate
      ORDER BY ot.code
    `;

    const taxesResult = await pool.query(taxesQuery, params);

    return {
      period: {
        date_from,
        date_to,
        time_from: time_from || '00:00:00',
        time_to: time_to || '23:59:59',
      },
      summary: summaryResult.rows[0] || {
        total_orders: 0,
        total_subtotal: 0,
        total_discount: 0,
        total_service_charge: 0,
        total_tax: 0,
        total_rounding: 0,
        total_grand_total: 0,
        avg_order_value: 0,
        total_complimentary: 0,
      },
      products: productsResult.rows,
      discounts: discountsResult.rows,
      taxes: taxesResult.rows,
      payment_methods: paymentsResult.rows,
    };
  }

  /**
   * Get sales by payment method with detailed breakdown
   */
  static async getSalesByPaymentMethod(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to } = filters;

    let dateFilter = 'o.closed_at >= $2 AND o.closed_at <= $3';
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND 
           DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') <= $3::date)
          AND
          (CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) <= $${paramIndex + 1}::time)
        )
      `;
      params.push(time_from, time_to);
    }

    const query = `
      SELECT 
        pm.name as payment_method,
        pm.type as payment_type,
        COUNT(DISTINCT p.order_id) as transaction_count,
        SUM(p.amount) as total_amount,
        SUM(p.tendered_amount) as total_tendered,
        SUM(p.change_amount) as total_change,
        MIN(p.amount) as min_transaction,
        MAX(p.amount) as max_transaction,
        AVG(p.amount) as avg_transaction
      FROM payments p
      INNER JOIN payment_methods pm ON p.payment_method_id = pm.id
      INNER JOIN orders o ON p.order_id = o.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND p.status = 'paid'
        AND ${dateFilter}
      GROUP BY pm.id, pm.name, pm.type
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get top selling products
   */
  static async getTopSellingProducts(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to, limit = 20 } = filters;

    let dateFilter = 'o.closed_at >= $2 AND o.closed_at <= $3';
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND 
           DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') <= $3::date)
          AND
          (CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) <= $${paramIndex + 1}::time)
        )
      `;
      params.push(time_from, time_to);
      paramIndex += 2;
    }

    const query = `
      SELECT 
        oi.product_id,
        oi.product_name,
        p.category_id,
        c.name as category_name,
        SUM(oi.qty) as total_qty,
        COUNT(DISTINCT oi.order_id) as order_count,
        oi.unit_price,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.discount_amount) as total_discount,
        AVG(oi.qty) as avg_qty_per_order
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND oi.status != 'void'
        AND ${dateFilter}
      GROUP BY oi.product_id, oi.product_name, p.category_id, c.name, oi.unit_price
      ORDER BY total_qty DESC
      LIMIT $${paramIndex}
    `;

    params.push(limit);
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get sales by category
   */
  static async getSalesByCategory(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to } = filters;

    let dateFilter = 'o.closed_at >= $2 AND o.closed_at <= $3';
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND 
           DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') <= $3::date)
          AND
          (CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) <= $${paramIndex + 1}::time)
        )
      `;
      params.push(time_from, time_to);
    }

    const query = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(DISTINCT oi.product_id) as product_count,
        SUM(oi.qty) as total_qty,
        SUM(oi.line_total) as total_revenue,
        SUM(oi.discount_amount) as total_discount,
        AVG(oi.unit_price) as avg_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND oi.status != 'void'
        AND ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get discount breakdown by type
   */
  static async getDiscountBreakdown(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to } = filters;

    let dateFilter = 'o.closed_at >= $2 AND o.closed_at <= $3';
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') >= $2::date AND 
           DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') <= $3::date)
          AND
          (CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AT TIME ZONE 'Asia/Jakarta' AS TIME) <= $${paramIndex + 1}::time)
        )
      `;
      params.push(time_from, time_to);
    }

    const query = `
      SELECT 
        od.name as discount_name,
        od.type,
        od.applied_stage,
        COUNT(DISTINCT od.order_id) as order_count,
        COUNT(*) as total_applications,
        SUM(od.amount) as total_amount,
        AVG(od.amount) as avg_amount,
        MIN(od.amount) as min_amount,
        MAX(od.amount) as max_amount
      FROM order_discounts od
      INNER JOIN orders o ON od.order_id = o.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND ${dateFilter}
      GROUP BY od.name, od.type, od.applied_stage
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get hourly sales breakdown
   */
  static async getHourlySales(store_id, filters = {}) {
    const { date_from, date_to } = filters;

    const query = `
      SELECT 
        EXTRACT(HOUR FROM o.closed_at AT TIME ZONE 'Asia/Jakarta') as hour,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.grand_total) as total_sales,
        AVG(o.grand_total) as avg_order_value
      FROM orders o
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND o.closed_at >= $2 
        AND o.closed_at <= $3
      GROUP BY EXTRACT(HOUR FROM o.closed_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY hour ASC
    `;

    const result = await pool.query(query, [store_id, date_from, date_to]);
    return result.rows;
  }

  /**
   * Get daily sales trend
   */
  static async getDailySales(store_id, filters = {}) {
    const { date_from, date_to } = filters;

    const query = `
      SELECT 
        DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta') as sale_date,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.subtotal) as subtotal,
        SUM(o.discount_total) as discount_total,
        SUM(o.service_charge_total) as service_charge_total,
        SUM(o.tax_total) as tax_total,
        SUM(o.grand_total) as grand_total,
        AVG(o.grand_total) as avg_order_value
      FROM orders o
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND o.closed_at >= $2 
        AND o.closed_at <= $3
      GROUP BY DATE(o.closed_at AT TIME ZONE 'Asia/Jakarta')
      ORDER BY sale_date ASC
    `;

    const result = await pool.query(query, [store_id, date_from, date_to]);
    return result.rows;
  }
}

module.exports = SalesModel;
