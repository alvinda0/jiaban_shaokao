const { pool } = require('../config/db');

class OrderModel {
  // ==================== ORDER CRUD ====================
  
  // Get all orders by store with filters and pagination
  static async findByStore(store_id, filters = {}) {
    let countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE o.store_id = $1
    `;
    
    let query = `
      SELECT o.*, 
             t.number as table_number, t.type as table_type,
             u.name as created_by_name,
             (
               SELECT STRING_AGG(DISTINCT pm.name, ', ' ORDER BY pm.name)
               FROM payments p
               LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
               WHERE p.order_id = o.id AND p.status = 'paid'
             ) as payment_methods,
             (
               SELECT EXISTS (
                 SELECT 1
                 FROM order_items oi
                 WHERE oi.order_id = o.id
                   AND oi.merged_from_order_number IS NOT NULL
                   AND oi.merged_from_order_number != ''
               )
             ) as has_merged_items
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.store_id = $1
    `;
    
    const params = [store_id];
    const countParams = [store_id];
    let paramIndex = 2;
    
    // Default filter: Only show orders from last 2 days (today and yesterday)
    // Unless explicit date_from is provided
    if (!filters.date_from && !filters.date_to) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 1); // Yesterday start
      twoDaysAgo.setHours(0, 0, 0, 0);
      
      query += ` AND o.opened_at >= $${paramIndex}`;
      countQuery += ` AND o.opened_at >= $${paramIndex}`;
      params.push(twoDaysAgo.toISOString());
      countParams.push(twoDaysAgo.toISOString());
      paramIndex++;
      
      console.log(`📅 Default filter applied: showing orders from ${twoDaysAgo.toISOString()}`);
    }
    
    // Filter by status
    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      countQuery += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      countParams.push(filters.status);
      paramIndex++;
    }
    
    // Filter by order_type
    if (filters.order_type) {
      query += ` AND o.order_type = $${paramIndex}`;
      countQuery += ` AND o.order_type = $${paramIndex}`;
      params.push(filters.order_type);
      countParams.push(filters.order_type);
      paramIndex++;
    }
    
    // Filter by table_id
    if (filters.table_id) {
      query += ` AND o.table_id = $${paramIndex}`;
      countQuery += ` AND o.table_id = $${paramIndex}`;
      params.push(filters.table_id);
      countParams.push(filters.table_id);
      paramIndex++;
    }
    
    // Filter by date range
    if (filters.date_from) {
      query += ` AND o.opened_at >= $${paramIndex}`;
      countQuery += ` AND o.opened_at >= $${paramIndex}`;
      params.push(filters.date_from);
      countParams.push(filters.date_from);
      paramIndex++;
    }
    
    if (filters.date_to) {
      query += ` AND o.opened_at <= $${paramIndex}`;
      countQuery += ` AND o.opened_at <= $${paramIndex}`;
      params.push(filters.date_to);
      countParams.push(filters.date_to);
      paramIndex++;
    }
    
    // Order by status priority (pending, processing, paid, void) then by opened_at DESC
    query += ` ORDER BY 
      CASE o.status 
        WHEN 'pending' THEN 1 
        WHEN 'processing' THEN 2 
        WHEN 'paid' THEN 3 
        WHEN 'void' THEN 4 
        ELSE 5 
      END ASC,
      o.opened_at DESC`;
    
    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;
    
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    // Get total count
    const countResult = await pool.query(countQuery, countParams);
    const total = countResult.rows[0].total;
    
    // Get data
    const result = await pool.query(query, params);
    
    // Return paginated result
    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get single order by ID with full details
  static async findById(id, store_id = null) {
    let query = `
      SELECT o.*, 
             t.number as table_number, t.type as table_type,
             u.name as created_by_name,
             comp_user.name as complimentary_by_name,
             void_user.name as voided_by_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users comp_user ON o.complimentary_by = comp_user.id
      LEFT JOIN users void_user ON o.voided_by = void_user.id
      WHERE o.id = $1
    `;
    
    const params = [id];
    
    if (store_id) {
      query += ` AND o.store_id = $2`;
      params.push(store_id);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // Generate order number
  static async generateOrderNumber(store_id) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${today}`;
    
    const result = await pool.query(
      `SELECT order_number FROM orders 
       WHERE store_id = $1 AND order_number LIKE $2 
       ORDER BY order_number DESC LIMIT 1`,
      [store_id, `${prefix}-%`]
    );
    
    let sequence = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].order_number.split('-').pop();
      sequence = parseInt(lastNumber) + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  // Create new order
  static async create(data) {
    const {
      store_id,
      table_id,
      order_type,
      source,
      customer_name,
      customer_phone,
      guest_count,
      notes,
      created_by,
    } = data;

    // Generate order number
    const orderNumber = await this.generateOrderNumber(store_id);

    const result = await pool.query(
      `INSERT INTO orders 
       (store_id, table_id, order_number, order_type, source, customer_name, customer_phone, guest_count, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        store_id,
        table_id || null,
        orderNumber,
        order_type || 'dine_in',
        source || 'pos',
        customer_name || null,
        customer_phone || null,
        guest_count || null,
        notes || null,
        created_by || null,
      ]
    );

    return { insertId: result.rows[0].id, orderNumber };
  }

  // Update order basic info
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Dynamic field updates
    const allowedFields = ['table_id', 'order_type', 'customer_name', 'customer_phone', 'guest_count', 'notes', 'status'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    });

    if (fields.length === 0) {
      return null; // Nothing to update
    }

    values.push(id); // Add id for WHERE clause
    
    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return result;
  }

  // Update order totals
  static async updateTotals(id, totals) {
    const {
      subtotal,
      discount_total,
      service_charge_total,
      tax_total,
      rounding,
      grand_total,
      paid_total,
    } = totals;

    // Helper to safely round monetary values (sanitize Infinity/NaN before rounding)
    const safeRound = (value) => {
      const num = Number(value) || 0;
      return isFinite(num) ? Math.round(num) : 0;
    };

    // Round all monetary values to nearest integer (no decimal)
    const params = [
      safeRound(subtotal),
      safeRound(discount_total),
      safeRound(service_charge_total),
      safeRound(tax_total),
      safeRound(rounding),
      safeRound(grand_total),
      safeRound(paid_total),
      id,
    ];

    console.log('💾 updateTotals params (rounded):', JSON.stringify(params, null, 2));

    const result = await pool.query(
      `UPDATE orders 
       SET subtotal = $1, discount_total = $2, service_charge_total = $3, 
           tax_total = $4, rounding = $5, grand_total = $6, paid_total = $7
       WHERE id = $8`,
      params
    );
    return result;
  }

  // Update order status
  static async updateStatus(id, status, additionalData = {}) {
    let query = `UPDATE orders SET status = $1`;
    const params = [status];
    let paramIndex = 2;

    if (status === 'paid' && additionalData.closed_at) {
      query += `, closed_at = $${paramIndex}`;
      params.push(additionalData.closed_at);
      paramIndex++;
    }

    if (status === 'void') {
      query += `, voided_by = $${paramIndex}, void_reason = $${paramIndex + 1}`;
      params.push(additionalData.voided_by || null, additionalData.void_reason || null);
      paramIndex += 2;
    }

    if (status === 'merged') {
      query += `, merged_into_order_id = $${paramIndex}`;
      params.push(additionalData.merged_into_order_id);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(id);

    const result = await pool.query(query, params);
    return result;
  }

  // Set order as complimentary
  static async setComplimentary(id, data) {
    const { is_complimentary, complimentary_amount, complimentary_reason, complimentary_by } = data;

    const result = await pool.query(
      `UPDATE orders 
       SET is_complimentary = $1, complimentary_amount = $2, 
           complimentary_reason = $3, complimentary_by = $4
       WHERE id = $5`,
      [is_complimentary, complimentary_amount || 0, complimentary_reason || null, complimentary_by || null, id]
    );
    return result;
  }

  // Delete order (only if no items)
  static async remove(id) {
    const result = await pool.query(`DELETE FROM orders WHERE id = $1`, [id]);
    return result;
  }

  // ==================== ORDER ITEMS ====================

  // Get all items for an order
  static async getOrderItems(order_id) {
    const result = await pool.query(
      `SELECT oi.*, 
              p.name as current_product_name,
              c.name as category_name,
              u.name as created_by_name,
              comp_user.name as complimentary_by_name,
              orig_order.order_number as original_order_number,
              COALESCE(
                json_agg(
                  json_build_object(
                    'group_id', vg.id,
                    'group_name', oiv.group_name,
                    'option_id', oiv.variant_option_id,
                    'option_name', oiv.option_name,
                    'price_adjustment', oiv.price_adjustment
                  )
                  ORDER BY oiv.id
                ) FILTER (WHERE oiv.id IS NOT NULL),
                '[]'
              ) as variants
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON oi.created_by = u.id
       LEFT JOIN users comp_user ON oi.complimentary_by = comp_user.id
       LEFT JOIN orders orig_order ON oi.original_order_id = orig_order.id
       LEFT JOIN order_item_variants oiv ON oiv.order_item_id = oi.id
       LEFT JOIN variant_options vo ON oiv.variant_option_id = vo.id
       LEFT JOIN variant_groups vg ON vo.variant_group_id = vg.id
       WHERE oi.order_id = $1
       GROUP BY oi.id, p.name, c.name, u.name, comp_user.name, orig_order.order_number
       ORDER BY oi.created_at ASC`,
      [order_id]
    );
    return result.rows;
  }

  // Get single order item
  static async getOrderItemById(item_id) {
    const result = await pool.query(
      `SELECT oi.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'group_id', vg.id,
                    'group_name', oiv.group_name,
                    'option_id', oiv.variant_option_id,
                    'option_name', oiv.option_name,
                    'price_adjustment', oiv.price_adjustment
                  )
                  ORDER BY oiv.id
                ) FILTER (WHERE oiv.id IS NOT NULL),
                '[]'
              ) as variants
       FROM order_items oi
       LEFT JOIN order_item_variants oiv ON oiv.order_item_id = oi.id
       LEFT JOIN variant_options vo ON oiv.variant_option_id = vo.id
       LEFT JOIN variant_groups vg ON vo.variant_group_id = vg.id
       WHERE oi.id = $1
       GROUP BY oi.id`,
      [item_id]
    );
    return result.rows[0];
  }

  // Add item to order
  static async addOrderItem(data) {
    const {
      order_id,
      product_id,
      product_name,
      qty,
      unit_price,
      variant_total,
      discount_amount,
      line_total,
      notes,
      created_by,
    } = data;

    const result = await pool.query(
      `INSERT INTO order_items 
       (order_id, product_id, product_name, qty, unit_price, variant_total, 
        discount_amount, line_total, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        order_id,
        product_id,
        product_name,
        qty || 1,
        unit_price,
        variant_total || 0,
        discount_amount || 0,
        line_total,
        notes || null,
        created_by || null,
      ]
    );

    return { insertId: result.rows[0].id };
  }

  // Update order item
  static async updateOrderItem(item_id, data) {
    const { qty, unit_price, variant_total, discount_amount, line_total, notes, status } = data;

    const result = await pool.query(
      `UPDATE order_items 
       SET qty = $1, unit_price = $2, variant_total = $3, discount_amount = $4, 
           line_total = $5, notes = $6, status = $7
       WHERE id = $8`,
      [qty, unit_price, variant_total, discount_amount, line_total, notes, status, item_id]
    );
    return result;
  }

  // Set item as complimentary
  static async setItemComplimentary(item_id, data) {
    const { is_complimentary, complimentary_reason, complimentary_by } = data;

    const result = await pool.query(
      `UPDATE order_items 
       SET is_complimentary = $1, complimentary_reason = $2, complimentary_by = $3
       WHERE id = $4`,
      [is_complimentary, complimentary_reason || null, complimentary_by || null, item_id]
    );
    return result;
  }

  // Void order item
  static async voidOrderItem(item_id, voided_by, void_reason) {
    const result = await pool.query(
      `UPDATE order_items 
       SET status = 'void', voided_by = $1, void_reason = $2
       WHERE id = $3`,
      [voided_by, void_reason || null, item_id]
    );
    return result;
  }

  // Delete order item
  static async removeOrderItem(item_id) {
    const result = await pool.query(`DELETE FROM order_items WHERE id = $1`, [item_id]);
    return result;
  }

  // ==================== ORDER ITEM VARIANTS ====================

  // Get variants for an order item
  static async getOrderItemVariants(order_item_id) {
    const result = await pool.query(
      `SELECT * FROM order_item_variants WHERE order_item_id = $1`,
      [order_item_id]
    );
    return result.rows;
  }

  // Add variant to order item
  static async addOrderItemVariant(data) {
    const { order_item_id, variant_option_id, group_name, option_name, price_adjustment } = data;

    const result = await pool.query(
      `INSERT INTO order_item_variants 
       (order_item_id, variant_option_id, group_name, option_name, price_adjustment) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [order_item_id, variant_option_id || null, group_name, option_name, price_adjustment || 0]
    );

    return { insertId: result.rows[0].id };
  }

  // Delete variants for order item
  static async removeOrderItemVariants(order_item_id) {
    const result = await pool.query(
      `DELETE FROM order_item_variants WHERE order_item_id = $1`,
      [order_item_id]
    );
    return result;
  }

  // ==================== ORDER DISCOUNTS ====================

  // Get discounts for an order
  static async getOrderDiscounts(order_id) {
    const result = await pool.query(
      `SELECT od.*, 
              u.name as applied_by_name,
              approver.name as approved_by_name
       FROM order_discounts od
       LEFT JOIN users u ON od.applied_by = u.id
       LEFT JOIN users approver ON od.approved_by = approver.id
       WHERE od.order_id = $1
       ORDER BY od.created_at ASC`,
      [order_id]
    );
    return result.rows;
  }

  // Add discount to order or item
  static async addDiscount(data) {
    const {
      order_id,
      order_item_id,
      discount_id,
      bill_id,
      name,
      type,
      value,
      amount,
      applied_stage,
      approved_by,
      applied_by,
    } = data;

    console.log('💰 addDiscount called with:', {
      order_id,
      order_item_id,
      bill_id,
      bill_id_type: typeof bill_id,
      bill_id_value: JSON.stringify(bill_id),
      discount_id,
      name,
      type,
      value,
      amount,
    });

    const result = await pool.query(
      `INSERT INTO order_discounts 
       (order_id, order_item_id, bill_id, discount_id, name, type, value, amount, applied_stage, approved_by, applied_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        order_id,
        order_item_id || null,
        bill_id || null,
        discount_id || null,
        name,
        type,
        value,
        amount,
        applied_stage || 'order',
        approved_by || null,
        applied_by || null,
      ]
    );

    return { insertId: result.rows[0].id };
  }

  // Remove discount
  static async removeDiscount(discount_record_id) {
    const result = await pool.query(
      `DELETE FROM order_discounts WHERE id = $1`,
      [discount_record_id]
    );
    return result;
  }

  // Update discount amount (for voucher recalculation)
  static async updateDiscount(discount_record_id, data) {
    const { value, amount } = data;
    
    const result = await pool.query(
      `UPDATE order_discounts 
       SET value = $1, amount = $2
       WHERE id = $3 
       RETURNING *`,
      [value, amount, discount_record_id]
    );
    
    return result.rows[0];
  }

  // Update discount name (for adding source order info during merge)
  static async updateDiscountName(discount_record_id, newName) {
    const result = await pool.query(
      `UPDATE order_discounts 
       SET name = $1
       WHERE id = $2 
       RETURNING *`,
      [newName, discount_record_id]
    );
    
    return result.rows[0];
  }

  // Update order notes (for copying voucher info during merge)
  static async updateOrderNotes(order_id, notes) {
    const result = await pool.query(
      `UPDATE orders 
       SET notes = $1
       WHERE id = $2 
       RETURNING *`,
      [notes, order_id]
    );
    
    return result.rows[0];
  }

  // Remove all discounts for order (by stage)
  static async removeOrderDiscountsByStage(order_id, applied_stage) {
    const result = await pool.query(
      `DELETE FROM order_discounts WHERE order_id = $1 AND applied_stage = $2`,
      [order_id, applied_stage]
    );
    return result;
  }

  // ==================== ORDER TAXES ====================

  // Get taxes for an order
  static async getOrderTaxes(order_id) {
    const result = await pool.query(
      `SELECT ot.*, tr.name as tax_name
       FROM order_taxes ot
       LEFT JOIN tax_rules tr ON ot.tax_rule_id = tr.id
       WHERE ot.order_id = $1`,
      [order_id]
    );
    return result.rows;
  }

  // Add or update tax for order
  static async upsertOrderTax(data) {
    const { order_id, tax_rule_id, code, rate, base_amount, amount } = data;

    // Check if exists
    const existing = await pool.query(
      `SELECT id FROM order_taxes WHERE order_id = $1 AND code = $2`,
      [order_id, code]
    );

    if (existing.rows.length > 0) {
      // Update
      await pool.query(
        `UPDATE order_taxes 
         SET tax_rule_id = $1, rate = $2, base_amount = $3, amount = $4
         WHERE id = $5`,
        [tax_rule_id || null, rate, base_amount, amount, existing.rows[0].id]
      );
      return { insertId: existing.rows[0].id, updated: true };
    } else {
      // Insert
      const result = await pool.query(
        `INSERT INTO order_taxes 
         (order_id, tax_rule_id, code, rate, base_amount, amount) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [order_id, tax_rule_id || null, code, rate, base_amount, amount]
      );
      return { insertId: result.rows[0].id, updated: false };
    }
  }

  // Remove tax from order
  static async removeOrderTax(order_id, code) {
    const result = await pool.query(
      `DELETE FROM order_taxes WHERE order_id = $1 AND code = $2`,
      [order_id, code]
    );
    return result;
  }

  // ==================== PAYMENTS ====================

  // Get payments for an order
  static async getPayments(order_id, bill_id = null) {
    let query = `
      SELECT p.id, p.order_id, p.payment_method_id, p.amount, p.tendered_amount, p.change_amount, 
             p.reference_no, p.received_by, p.status, p.paid_at,
             pm.name as payment_method_name, pm.type as payment_method_type,
             u.name as received_by_name
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.order_id = $1
    `;
    
    const params = [order_id];
    
    if (bill_id) {
      // bill_id check temporarily disabled until column is properly synced
      // query += ` AND p.bill_id = $2`;
      // params.push(bill_id);
    }
    
    query += ` AND p.status = 'paid' ORDER BY p.paid_at ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Add payment
  static async addPayment(data) {
    const {
      order_id,
      bill_id,
      payment_method_id,
      amount,
      tendered_amount,
      change_amount,
      reference_no,
      received_by,
    } = data;

    const result = await pool.query(
      `INSERT INTO payments 
       (order_id, bill_id, payment_method_id, amount, tendered_amount, change_amount, reference_no, received_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        order_id,
        bill_id || null,
        payment_method_id,
        amount,
        tendered_amount || null,
        change_amount || 0,
        reference_no || null,
        received_by || null,
      ]
    );

    return { insertId: result.rows[0].id };
  }

  // Void payment
  static async voidPayment(payment_id, voided_by, void_reason) {
    const result = await pool.query(
      `UPDATE payments 
       SET status = 'void', voided_by = $1, void_reason = $2
       WHERE id = $3`,
      [voided_by, void_reason || null, payment_id]
    );
    return result;
  }

  // ==================== ORDER MERGE ====================

  // Merge orders
  static async mergeOrders(target_order_id, source_order_id, merged_by) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔀 Starting merge...');
      console.log('  Target:', target_order_id);
      console.log('  Source:', source_order_id);

      // Get source order number before deleting
      const sourceOrderResult = await client.query(
        `SELECT order_number FROM orders WHERE id = $1`,
        [source_order_id]
      );
      const sourceOrderNumber = sourceOrderResult.rows[0]?.order_number;

      // Move items from source to target and save source order number
      const updateResult = await client.query(
        `UPDATE order_items 
         SET order_id = $1,
             original_order_id = $2,
             merged_from_order_number = $3
         WHERE order_id = $2
         RETURNING id, product_name, merged_from_order_number`,
        [target_order_id, source_order_id, sourceOrderNumber]
      );
      
      console.log(`  ✅ Moved ${updateResult.rowCount} items:`);
      updateResult.rows.forEach(item => {
        console.log(`     - ${item.product_name} (${item.id}) from: ${item.merged_from_order_number}`);
      });

      // Delete order_taxes from source order
      await client.query(
        `DELETE FROM order_taxes WHERE order_id = $1`,
        [source_order_id]
      );

      // Delete order_discounts from source order
      await client.query(
        `DELETE FROM order_discounts WHERE order_id = $1`,
        [source_order_id]
      );

      // Delete the source order completely
      const deleteResult = await client.query(
        `DELETE FROM orders WHERE id = $1 RETURNING order_number`,
        [source_order_id]
      );
      
      console.log(`  ✅ Deleted source order: ${deleteResult.rows[0]?.order_number}`);

      await client.query('COMMIT');
      console.log('✅ Merge completed!\n');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Merge failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== ORDER BILLS (SPLIT PAYMENT) ====================

  // Get bills for an order
  static async getOrderBills(order_id) {
    const result = await pool.query(
      `SELECT * FROM order_bills WHERE order_id = $1 ORDER BY bill_number ASC`,
      [order_id]
    );
    return result.rows;
  }

  // Get single bill
  static async getBillById(bill_id) {
    const result = await pool.query(
      `SELECT * FROM order_bills WHERE id = $1`,
      [bill_id]
    );
    return result.rows[0];
  }

  // Create bill for split payment
  static async createBill(data) {
    const {
      order_id,
      bill_number,
      label,
      subtotal,
      discount_total,
      service_charge_total,
      tax_total,
      rounding,
      grand_total,
    } = data;

    const result = await pool.query(
      `INSERT INTO order_bills 
       (order_id, bill_number, label, subtotal, discount_total, service_charge_total, 
        tax_total, rounding, grand_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        order_id,
        bill_number,
        label || null,
        subtotal || 0,
        discount_total || 0,
        service_charge_total || 0,
        tax_total || 0,
        rounding || 0,
        grand_total || 0,
      ]
    );

    return { insertId: result.rows[0].id };
  }

  // Update bill totals
  static async updateBillTotals(bill_id, totals) {
    const { subtotal, discount_total, service_charge_total, tax_total, rounding, grand_total } = totals;

    const result = await pool.query(
      `UPDATE order_bills 
       SET subtotal = $1, discount_total = $2, service_charge_total = $3, tax_total = $4, rounding = $5, grand_total = $6
       WHERE id = $7`,
      [subtotal, discount_total, service_charge_total, tax_total, rounding, grand_total, bill_id]
    );
    return result;
  }

  // Update bill paid amount
  static async updateBillPaid(bill_id, paid_total, status) {
    try {
      const result = await pool.query(
        `UPDATE order_bills 
         SET paid_total = $1, status = $2::bill_status, paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE NULL END
         WHERE id = $3`,
        [paid_total, status, bill_id]
      );
      console.log(`✅ Bill ${bill_id} status updated to: ${status}, paid_total: ${paid_total}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating bill paid status:`, error.message);
      throw error;
    }
  }

  // Get bill items
  static async getBillItems(bill_id) {
    const result = await pool.query(
      `SELECT 
        obi.id,
        obi.bill_id,
        obi.order_item_id,
        obi.qty,
        obi.amount,
        oi.product_name,
        oi.unit_price,
        CASE 
          WHEN obi.qty > 0 THEN obi.amount / obi.qty 
          ELSE 0 
        END as calculated_unit_price
       FROM order_bill_items obi
       LEFT JOIN order_items oi ON obi.order_item_id = oi.id
       WHERE obi.bill_id = $1`,
      [bill_id]
    );
    return result.rows;
  }

  // Get payments for a specific bill
  static async getBillPayments(bill_id) {
    const result = await pool.query(
      `SELECT p.*, 
             pm.name as payment_method_name, pm.type as payment_method_type,
             u.name as received_by_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.bill_id = $1 AND p.status = 'paid'
       ORDER BY p.paid_at ASC`,
      [bill_id]
    );
    return result.rows;
  }

  // Add item to bill
  static async addBillItem(data) {
    const { bill_id, order_item_id, qty, unit_price, line_total } = data;

    const result = await pool.query(
      `INSERT INTO order_bill_items (bill_id, order_item_id, qty, amount) 
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [bill_id, order_item_id, qty, line_total]
    );

    return { insertId: result.rows[0].id };
  }

  // ==================== HELPER FUNCTIONS ====================

  // Check if order exists and belongs to store
  static async exists(order_id, store_id = null) {
    let query = `SELECT id FROM orders WHERE id = $1`;
    const params = [order_id];

    if (store_id) {
      query += ` AND store_id = $2`;
      params.push(store_id);
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  // Get order with full details (items, taxes, discounts, payments)
  static async getFullOrderDetails(order_id) {
    const order = await this.findById(order_id);
    if (!order) return null;

    // Get items with variants (variants now included in query)
    const items = await this.getOrderItems(order_id);
    
    console.log('🔍 getFullOrderDetails - items from getOrderItems:');
    items.forEach(item => {
      console.log(`   - ${item.product_name} (${item.id}): original_order_id=${item.original_order_id}, original_order_number=${item.original_order_number}, variants=${JSON.stringify(item.variants)}`);
    });

    // Get discounts, taxes, payments
    order.items = items;
    order.discounts = await this.getOrderDiscounts(order_id);
    order.taxes = await this.getOrderTaxes(order_id);
    order.payments = await this.getPayments(order_id);
    
    // Get bills with items and payments
    const bills = await this.getOrderBills(order_id);
    for (let bill of bills) {
      bill.items = await this.getBillItems(bill.id);
      // Get payments for this specific bill
      bill.payments = await this.getBillPayments(bill.id);
    }
    order.bills = bills;

    // Sanitize numeric fields before returning (handle Infinity/NaN)
    const safeNum = (val) => {
      const num = Number(val) || 0;
      return isFinite(num) ? num : 0;
    };

    order.subtotal = safeNum(order.subtotal);
    order.discount_total = safeNum(order.discount_total);
    order.service_charge_total = safeNum(order.service_charge_total);
    order.tax_total = safeNum(order.tax_total);
    order.grand_total = safeNum(order.grand_total);
    order.rounding = safeNum(order.rounding);
    order.paid_total = safeNum(order.paid_total);

    return order;
  }

  // ==================== ORDER STATISTICS ====================

  // Get order statistics for today
  static async getTodayStatistics(store_id) {
    // Get today's date in Asia/Jakarta timezone
    const today = new Date();
    const jakartaOffset = 7 * 60; // GMT+7 in minutes
    const localDate = new Date(today.getTime() + (jakartaOffset - today.getTimezoneOffset()) * 60000);
    localDate.setHours(0, 0, 0, 0);
    
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE opened_at::date = CURRENT_DATE) as total_orders_today,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as active_orders,
        COALESCE(SUM(grand_total) FILTER (WHERE status = 'paid' AND opened_at::date = CURRENT_DATE), 0) as revenue_today
      FROM orders
      WHERE store_id = $1
    `;
    
    const result = await pool.query(query, [store_id]);
    const stats = result.rows[0];
    
    return {
      total_orders_today: parseInt(stats.total_orders_today) || 0,
      active_orders: parseInt(stats.active_orders) || 0,
      revenue_today: Math.round(Number(stats.revenue_today)) || 0
    };
  }
}

module.exports = OrderModel;
