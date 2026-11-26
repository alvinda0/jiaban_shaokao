const { pool } = require('../config/db');

class ReportModel {
  static async getProfitLossReport(store_id, filters = {}) {
    const { date_from, date_to } = filters;
    const dateFilter = `((COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2 AND $3)`;
    const params = [store_id, date_from, date_to];

    try {
      // A. PENDAPATAN
      const revenueQuery = `
        SELECT 
          COUNT(DISTINCT o.id) as order_count,
          SUM(o.subtotal) as subtotal,
          SUM(o.discount_total) as discount_total,
          SUM(o.service_charge_total) as service_charge,
          SUM(o.tax_total) as tax_total,
          SUM(o.grand_total) as total_revenue
        FROM orders o
        WHERE o.store_id = $1 AND o.status = 'paid' AND o.complimentary_amount = 0 AND ${dateFilter}
      `;

      const revenueResult = await pool.query(revenueQuery, params);
      const totalRevenue = revenueResult.rows[0] || {};

      // Get actual discount from order_discounts table
      const actualDiscountQuery = `
        SELECT SUM(amount) as total_discount
        FROM order_discounts od
        INNER JOIN orders o ON od.order_id = o.id
        WHERE o.store_id = $1 AND o.status = 'paid' AND o.complimentary_amount = 0 AND ${dateFilter}
      `;
      
      const discountResult = await pool.query(actualDiscountQuery, params);
      const actualDiscount = parseFloat(discountResult.rows[0]?.total_discount || 0);

      // Get complimentary from payments with COMPLIMENTARY method
      const complimentaryQuery = `
        SELECT SUM(p.amount) as total_complimentary
        FROM payments p
        INNER JOIN orders o ON p.order_id = o.id
        INNER JOIN payment_methods pm ON p.payment_method_id = pm.id
        WHERE o.store_id = $1 AND o.status = 'paid' 
        AND LOWER(COALESCE(pm.code, '')) IN ('complimentary', 'gratis')
        AND ${dateFilter}
      `;

      const complimentaryResult = await pool.query(complimentaryQuery, params);
      const totalComplimentary = parseFloat(complimentaryResult.rows[0]?.total_complimentary || 0);
      
      console.log('🔍 Complimentary Query Debug:', {
        complimentaryQuery,
        params,
        complimentaryResult: complimentaryResult.rows[0],
        totalComplimentary
      });

      // B. COGS
      const cogsQuery = `
        SELECT 
          SUM(COALESCE(p.cost_price, 0) * oi.qty) as total_cogs,
          SUM(oi.qty) as total_items_sold
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.store_id = $1 AND o.status = 'paid' AND o.complimentary_amount = 0 AND oi.status != 'void' AND ${dateFilter}
      `;

      const cogsResult = await pool.query(cogsQuery, params);
      const cogsData = cogsResult.rows[0] || { total_cogs: 0, total_items_sold: 0 };

      // C. LABA KOTOR
      const totalRevenueWithComplimentary = (totalRevenue.total_revenue || 0) - totalComplimentary;
      const grossProfit = totalRevenueWithComplimentary - (cogsData.total_cogs || 0);
      const grossProfitMargin = totalRevenueWithComplimentary
        ? ((grossProfit / totalRevenueWithComplimentary) * 100).toFixed(2)
        : 0;

      // D. PENGELUARAN
      const discountQuery = `
        SELECT SUM(amount) as total_discount 
        FROM order_discounts od
        INNER JOIN orders o ON od.order_id = o.id
        WHERE o.store_id = $1 AND o.status = 'paid' AND o.complimentary_amount = 0 AND ${dateFilter}
      `;

      const discountExpenseResult = await pool.query(discountQuery, params);
      const discountExpense = parseFloat(discountExpenseResult.rows[0]?.total_discount || 0);

      // Kompayment (Complimentary/Free Items & Orders)
      const compaymentItemQuery = `
        SELECT SUM(COALESCE(oi.line_total, 0)) as total_complimentary
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.store_id = $1 AND o.status = 'paid' AND oi.is_complimentary = true AND ${dateFilter}
      `;

      const compaymentItemResult = await pool.query(compaymentItemQuery, params);
      const totalCompaymentItemExpense = parseFloat(compaymentItemResult.rows[0]?.total_complimentary || 0);

      const totalOperatingExpenses = discountExpense + totalComplimentary + totalCompaymentItemExpense;

      // E. LABA BERSIH
      const netProfit = grossProfit - totalOperatingExpenses;
      const netProfitMargin = totalRevenueWithComplimentary
        ? ((netProfit / totalRevenueWithComplimentary) * 100).toFixed(2)
        : 0;

      // Product Breakdown
      const productQuery = `
        SELECT 
          oi.product_id,
          oi.product_name,
          SUM(oi.qty) as qty_sold,
          oi.unit_price,
          COALESCE(AVG(p.cost_price), 0) as avg_cost_price,
          SUM(oi.line_total) as sales_value,
          SUM(COALESCE(p.cost_price, 0) * oi.qty) as total_cogs,
          (SUM(oi.line_total) - SUM(COALESCE(p.cost_price, 0) * oi.qty)) as product_margin
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.store_id = $1 AND o.status = 'paid' AND o.complimentary_amount = 0 AND oi.status != 'void' AND ${dateFilter}
        GROUP BY oi.product_id, oi.product_name, oi.unit_price
        ORDER BY sales_value DESC
      `;

      const productResult = await pool.query(productQuery, params);

      console.log('📊 Final Report Response:', {
        total_revenue: parseFloat(totalRevenue.total_revenue || 0),
        totalComplimentary,
        total_revenue_with_complimentary: parseFloat((totalRevenue.total_revenue || 0) + totalComplimentary)
      });

      return {
        period: { date_from, date_to },
        A_pendapatan: {
          total_subtotal: parseFloat(totalRevenue.subtotal || 0),
          total_discount: parseFloat(actualDiscount),
          total_service_charge: parseFloat(totalRevenue.service_charge || 0),
          total_tax: parseFloat(totalRevenue.tax_total || 0),
          total_revenue: parseFloat(totalRevenue.total_revenue || 0),
          complimentary_amount: parseFloat(totalComplimentary),
          total_revenue_with_complimentary: parseFloat((totalRevenue.total_revenue || 0) - totalComplimentary),
          order_count: totalRevenue.order_count || 0,
        },
        B_harga_pokok_penjualan: {
          total_cogs: parseFloat(cogsData.total_cogs || 0),
          total_items_sold: cogsData.total_items_sold || 0,
          avg_cogs_per_item: cogsData.total_items_sold 
            ? parseFloat((cogsData.total_cogs / cogsData.total_items_sold).toFixed(2))
            : 0,
        },
        C_laba_kotor: {
          laba_kotor: parseFloat(grossProfit.toFixed(2)),
          margin_percentage: parseFloat(grossProfitMargin),
        },
        D_pengeluaran: {
          discount_given: parseFloat((discountExpense).toFixed(2)),
          complimentary: parseFloat((totalComplimentary).toFixed(2)),
          refunds: 0,
          other_expenses: 0,
          total_expenses: parseFloat((totalOperatingExpenses).toFixed(2)),
        },
        E_laba_rugi_bersih: {
          laba_rugi_bersih: parseFloat(netProfit.toFixed(2)),
          margin_percentage: parseFloat(netProfitMargin),
        },
        product_breakdown: productResult.rows.map(row => ({
          product_id: row.product_id,
          product_name: row.product_name,
          qty_sold: row.qty_sold,
          unit_price: parseFloat(row.unit_price),
          avg_cost_price: parseFloat(row.avg_cost_price),
          sales_value: parseFloat(row.sales_value || 0),
          total_cogs: parseFloat(row.total_cogs || 0),
          product_margin: parseFloat(row.product_margin || 0),
          margin_percentage: row.sales_value 
            ? parseFloat(((row.product_margin / row.sales_value) * 100).toFixed(2))
            : 0,
        })),
      };
    } catch (error) {
      console.error('❌ getProfitLossReport error:', error);
      throw error;
    }
  }

  static async getDailyRevenue(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to } = filters;
    let dateFilter = `((COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2 AND $3)`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from) {
      dateFilter += ` AND (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::time >= $${paramIndex}::time`;
      params.push(time_from);
      paramIndex++;
    }
    if (time_to) {
      dateFilter += ` AND (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::time <= $${paramIndex}::time`;
      params.push(time_to);
      paramIndex++;
    }

    const query = `
      SELECT 
        (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::date as date,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.grand_total) as total_revenue,
        SUM(o.subtotal) as subtotal,
        SUM(o.discount_total) as discount_total,
        SUM(o.service_charge_total) as service_charge,
        SUM(o.tax_total) as tax_total,
        SUM(o.complimentary_amount) as complimentary_total
      FROM orders o
      WHERE o.store_id = $1 AND o.status = 'paid' AND ${dateFilter}
      GROUP BY (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::date
      ORDER BY date DESC
    `;

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        date: row.date,
        order_count: row.order_count,
        total_revenue: parseFloat(row.total_revenue || 0),
        subtotal: parseFloat(row.subtotal || 0),
        discount_total: parseFloat(row.discount_total || 0),
        service_charge: parseFloat(row.service_charge || 0),
        tax_total: parseFloat(row.tax_total || 0),
        complimentary_total: parseFloat(row.complimentary_total || 0),
      }));
    } catch (error) {
      console.error('❌ getDailyRevenue error:', error);
      throw error;
    }
  }

  static async getTopProducts(store_id, filters = {}) {
    const { date_from, date_to, time_from, time_to, limit = 10 } = filters;
    let dateFilter = `((COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2 AND $3)`;
    let params = [store_id, date_from, date_to];
    let paramIndex = 4;

    if (time_from) {
      dateFilter += ` AND (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::time >= $${paramIndex}::time`;
      params.push(time_from);
      paramIndex++;
    }
    if (time_to) {
      dateFilter += ` AND (COALESCE(o.closed_at, o.opened_at) AT TIME ZONE 'Asia/Jakarta')::time <= $${paramIndex}::time`;
      params.push(time_to);
      paramIndex++;
    }

    params.push(limit);

    const query = `
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.qty) as qty_sold,
        oi.unit_price,
        SUM(oi.line_total) as sales_value,
        SUM(COALESCE(p.cost_price, 0) * oi.qty) as total_cogs,
        (SUM(oi.line_total) - SUM(COALESCE(p.cost_price, 0) * oi.qty)) as product_margin
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.store_id = $1 AND o.status = 'paid' AND oi.status != 'void' AND ${dateFilter}
      GROUP BY oi.product_id, oi.product_name, oi.unit_price
      ORDER BY qty_sold DESC
      LIMIT $${paramIndex}
    `;

    try {
      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        qty_sold: row.qty_sold,
        unit_price: parseFloat(row.unit_price),
        sales_value: parseFloat(row.sales_value || 0),
        total_cogs: parseFloat(row.total_cogs || 0),
        product_margin: parseFloat(row.product_margin || 0),
        margin_percentage: row.sales_value 
          ? parseFloat(((row.product_margin / row.sales_value) * 100).toFixed(2))
          : 0,
      }));
    } catch (error) {
      console.error('❌ getTopProducts error:', error);
      throw error;
    }
  }
}

module.exports = ReportModel;
