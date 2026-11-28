const { pool } = require('../config/db');

console.log('✅ SalesModel loaded - Timezone bug fix v2.0 (2026-11-28)');

/**
 * Normalize time range - if time_from > time_to, swap them
 * @param {string} time_from - Start time in HH:MM:SS or HH:MM format
 * @param {string} time_to - End time in HH:MM:SS or HH:MM format
 * @returns {object} - Normalized {time_from, time_to}
 */
function normalizeTimeRange(time_from, time_to) {
  if (time_from && time_to && time_from > time_to) {
    console.log('⚠️  Time range reversed, swapping...');
    return { time_from: time_to, time_to: time_from };
  }
  return { time_from, time_to };
}

class SalesModel {

  static async getSalesReport(store_id, filters = {}) {
    let { date_from, date_to, time_from, time_to } = filters;

    console.log('🔍 getSalesReport START');
    console.log('   Input params:', { store_id, date_from, date_to, time_from, time_to });

    // Store original input from frontend
    const original_date_from = date_from;
    const original_date_to = date_to;
    const original_time_from = time_from;
    const original_time_to = time_to;

    // Normalize time_from and time_to
    ({ time_from, time_to } = normalizeTimeRange(time_from, time_to));
    console.log('   After time normalization:', { time_from, time_to });

    // Fetch store timezone for accurate date filtering
    const storeQuery = `SELECT timezone FROM stores WHERE id = $1`;
    console.log('   Executing store query:', storeQuery);
    const storeResult = await pool.query(storeQuery, [store_id]);
    console.log('   Store query result:', storeResult.rows);
    
    const timezone = storeResult.rows[0]?.timezone || 'Asia/Jakarta';
    console.log('🌍 Store Timezone:', timezone);

    // Adjust dates/times by subtracting 7 hours for UTC+7 timezone
    // This converts local dates back to UTC for database query
    const adjustDateTime = (dateStr, timeStr) => {
      const dateTime = new Date(`${dateStr}T${timeStr}:00`);
      dateTime.setHours(dateTime.getHours() - 7);
      const adjustedDate = dateTime.toISOString().split('T')[0];
      const adjustedTime = dateTime.toISOString().split('T')[1].substring(0, 5);
      return { date: adjustedDate, time: adjustedTime };
    };

    const adjustedFrom = adjustDateTime(date_from, time_from);
    const adjustedTo = adjustDateTime(date_to, time_to);

    console.log('⏰ Timezone adjusted:');
    console.log('   Original:', { date_from, time_from });
    console.log('   Adjusted:', adjustedFrom);
    console.log('   Original:', { date_to, time_to });
    console.log('   Adjusted:', adjustedTo);

    // Use adjusted dates/times for database query
    date_from = adjustedFrom.date;
    time_from = adjustedFrom.time;
    date_to = adjustedTo.date;
    time_to = adjustedTo.time;

    // Build date-time filter using store timezone
    // NOTE: opened_at is stored as timestamp WITHOUT timezone (naive/local time)
    // So we don't need AT TIME ZONE conversion - use dates directly
    let dateFilter = `DATE(o.opened_at) >= $2::date AND DATE(o.opened_at) <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    // If time filter is provided, combine with date
    if (time_from && time_to) {
      dateFilter = `
        (
          DATE(o.opened_at) >= $2::date AND 
          DATE(o.opened_at) <= $3::date
        )
        AND
        (CAST(o.opened_at AS TIME) >= $${paramIndex}::time AND
         CAST(o.opened_at AS TIME) <= $${paramIndex + 1}::time)
      `;
      params.push(time_from, time_to);
      paramIndex += 2;
    }

    console.log('📊 Sales Report Query:');
    console.log('   Store ID:', store_id);
    console.log('   Date From (adjusted):', date_from);
    console.log('   Date To (adjusted):', date_to);
    console.log('   Time From (adjusted):', time_from);
    console.log('   Time To (adjusted):', time_to);
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
    console.log('   📦 Products result count:', productsResult.rows.length);

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
    console.log('   💳 Discounts result count:', discountsResult.rows.length);

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
    console.log('   💰 Payments result count:', paymentsResult.rows.length);

    // Get overall summary - INCLUDE ALL ORDERS (use 2 separate queries to avoid JOIN duplication)
    const ordersQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.is_complimentary = true THEN o.id END) as total_complimentary_orders,
        SUM(o.discount_total) as total_discount,
        SUM(o.service_charge_total) as total_service_charge,
        SUM(o.tax_total) as total_tax,
        SUM(o.rounding) as total_rounding,
        SUM(o.grand_total) as total_grand_total,
        (SUM(o.grand_total) - SUM(COALESCE(o.complimentary_amount, 0))) as total_grand_total_after_complimentary,
        SUM(COALESCE(o.complimentary_amount, 0)) as total_complimentary_amount,
        AVG(o.grand_total) as avg_order_value
      FROM orders o
      WHERE o.store_id = $1 
        AND o.paid_total > 0
        AND o.status = 'paid'
        AND ${dateFilter}
    `;

    console.log('📋 Orders Query:', ordersQuery);
    console.log('   with params:', params);

    // Get subtotal from order_items
    const subtotalQuery = `
      SELECT 
        SUM(oi.line_total) as total_subtotal
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND oi.status != 'void'
        AND o.paid_total > 0
        AND ${dateFilter}
    `;

    // Get discount from order_discounts
    const discountQuery = `
      SELECT 
        SUM(od.amount) as total_discount
      FROM order_discounts od
      INNER JOIN orders o ON od.order_id = o.id
      WHERE o.store_id = $1 
        AND o.status = 'paid'
        AND o.paid_total > 0
        AND ${dateFilter}
    `;

    const [ordersResult, subtotalResult, discountResult] = await Promise.all([
      pool.query(ordersQuery, params),
      pool.query(subtotalQuery, params),
      pool.query(discountQuery, params)
    ]);

    console.log('   Orders result:', ordersResult.rows);

    const ordersSummary = ordersResult.rows[0] || {};
    const subtotalData = subtotalResult.rows[0] || {};
    const discountData = discountResult.rows[0] || {};

    const summaryResult = {
      total_orders: ordersSummary.total_orders,
      total_complimentary_orders: ordersSummary.total_complimentary_orders,
      total_subtotal: parseFloat(subtotalData.total_subtotal || 0),
      total_discount: parseFloat(discountData.total_discount || 0),
      total_service_charge: parseFloat(ordersSummary.total_service_charge || 0),
      total_tax: parseFloat(ordersSummary.total_tax || 0),
      total_rounding: parseFloat(ordersSummary.total_rounding || 0),
      total_grand_total: parseFloat(ordersSummary.total_grand_total || 0),
      total_grand_total_after_complimentary: parseFloat(ordersSummary.total_grand_total_after_complimentary || 0),
      total_complimentary_amount: parseFloat(ordersSummary.total_complimentary_amount || 0),
      avg_order_value: parseFloat(ordersSummary.avg_order_value || 0),
    };
    
    // Extract complimentary total from payments results
    const complimentaryTotal = paymentsResult.rows.find(pm => 
      pm.payment_method?.toUpperCase().includes('COMPLIMENTARY') || pm.payment_type?.toUpperCase().includes('COMPLIMENTARY')
    )?.total_amount || 0;
    
    console.log('📊 Query Results:');
    console.log('   Summary orders:', summaryResult.total_orders, 'complimentary:', complimentaryTotal);
    console.log('   Products:', productsResult.rows.length, 'Discounts:', discountsResult.rows.length);

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

    // Merge summary with complimentary total
    const mergedSummary = {
      ...summaryResult,
      total_complimentary: parseFloat(complimentaryTotal || 0),
    };

    return {
      period: {
        // Show ORIGINAL INPUT from frontend (what user selected)
        date_from: original_date_from,
        date_to: original_date_to,
        time_from: original_time_from || '00:00',
        time_to: original_time_to || '23:59',
      },
      server_period: {
        // Show the ADJUSTED dates/times used by server for querying
        date_from,
        date_to,
        time_from: time_from || '00:00',
        time_to: time_to || '23:59',
        queried_at: new Date().toISOString(),
      },
      summary: mergedSummary || {
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
    let { date_from, date_to, time_from, time_to } = filters;

    // Normalize time_from and time_to
    ({ time_from, time_to } = normalizeTimeRange(time_from, time_to));

    // Fetch store timezone
    const storeQuery = `SELECT timezone FROM stores WHERE id = $1`;
    const storeResult = await pool.query(storeQuery, [store_id]);
    const timezone = storeResult.rows[0]?.timezone || 'Asia/Jakarta';

    // NOTE: closed_at stored as timestamp WITHOUT timezone (naive/local time)
    // Don't use AT TIME ZONE - dates are already in local time
    let dateFilter = `DATE(o.closed_at) >= $2::date AND DATE(o.closed_at) <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at) >= $2::date AND 
           DATE(o.closed_at) <= $3::date)
          AND
          (CAST(o.closed_at AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AS TIME) <= $${paramIndex + 1}::time)
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
    let { date_from, date_to, time_from, time_to, limit = 20 } = filters;

    // Normalize time_from and time_to
    ({ time_from, time_to } = normalizeTimeRange(time_from, time_to));

    // Fetch store timezone
    const storeQuery = `SELECT timezone FROM stores WHERE id = $1`;
    const storeResult = await pool.query(storeQuery, [store_id]);
    const timezone = storeResult.rows[0]?.timezone || 'Asia/Jakarta';

    // NOTE: closed_at stored as timestamp WITHOUT timezone (naive/local time)
    // Don't use AT TIME ZONE - dates are already in local time
    let dateFilter = `DATE(o.closed_at) >= $2::date AND DATE(o.closed_at) <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at) >= $2::date AND 
           DATE(o.closed_at) <= $3::date)
          AND
          (CAST(o.closed_at AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AS TIME) <= $${paramIndex + 1}::time)
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
    let { date_from, date_to, time_from, time_to } = filters;

    // Normalize time_from and time_to
    ({ time_from, time_to } = normalizeTimeRange(time_from, time_to));

    // Fetch store timezone
    const storeQuery = `SELECT timezone FROM stores WHERE id = $1`;
    const storeResult = await pool.query(storeQuery, [store_id]);
    const timezone = storeResult.rows[0]?.timezone || 'Asia/Jakarta';

    let dateFilter = `DATE(o.closed_at) >= $2::date AND DATE(o.closed_at) <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at) >= $2::date AND 
           DATE(o.closed_at) <= $3::date)
          AND
          (CAST(o.closed_at AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AS TIME) <= $${paramIndex + 1}::time)
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
    let { date_from, date_to, time_from, time_to } = filters;

    // Normalize time_from and time_to
    ({ time_from, time_to } = normalizeTimeRange(time_from, time_to));

    // Fetch store timezone
    const storeQuery = `SELECT timezone FROM stores WHERE id = $1`;
    const storeResult = await pool.query(storeQuery, [store_id]);
    const timezone = storeResult.rows[0]?.timezone || 'Asia/Jakarta';

    let dateFilter = `DATE(o.closed_at) >= $2::date AND DATE(o.closed_at) <= $3::date`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from && time_to) {
      dateFilter = `
        (
          (DATE(o.closed_at) >= $2::date AND 
           DATE(o.closed_at) <= $3::date)
          AND
          (CAST(o.closed_at AS TIME) >= $${paramIndex}::time AND
           CAST(o.closed_at AS TIME) <= $${paramIndex + 1}::time)
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

