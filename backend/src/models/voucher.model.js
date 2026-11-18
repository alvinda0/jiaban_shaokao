const { pool } = require('../config/db');

class VoucherModel {
  static async findAll(storeId = null) {
    let sql = `
      SELECT v.*, p.name AS bundle_product_name, s.name AS store_name
      FROM vouchers v
      LEFT JOIN products p ON v.bundle_product_id = p.id
      LEFT JOIN stores s ON v.store_id = s.id
    `;
    const params = [];
    
    if (storeId) {
      sql += ' WHERE (v.store_id = $1 OR v.store_id IS NULL)';
      params.push(storeId);
    }
    
    sql += ' ORDER BY v.created_at DESC';
    
    const result = await pool.query(sql, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT v.*, p.name AS bundle_product_name, s.name AS store_name
       FROM vouchers v
       LEFT JOIN products p ON v.bundle_product_id = p.id
       LEFT JOIN stores s ON v.store_id = s.id
       WHERE v.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByCode(code) {
    const result = await pool.query(
      `SELECT v.*, p.name AS bundle_product_name, p.price AS bundle_product_price
       FROM vouchers v
       LEFT JOIN products p ON v.bundle_product_id = p.id
       WHERE v.code = $1`,
      [code]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const {
      store_id, code, name, description, type,
      discount_type, discount_value,
      bundle_product_id, bundle_qty, bundle_price,
      min_purchase, max_discount,
      usage_limit, usage_per_user,
      valid_from, valid_until, is_active
    } = data;

    const result = await pool.query(
      `INSERT INTO vouchers (
        store_id, code, name, description, type,
        discount_type, discount_value,
        bundle_product_id, bundle_qty, bundle_price,
        min_purchase, max_discount,
        usage_limit, usage_per_user,
        valid_from, valid_until, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        store_id || null, code, name, description || null, type,
        discount_type || null, discount_value || null,
        bundle_product_id || null, bundle_qty || null, bundle_price || null,
        min_purchase || 0, max_discount || null,
        usage_limit || null, usage_per_user || null,
        valid_from, valid_until, is_active !== undefined ? is_active : true
      ]
    );
    return { insertId: result.rows[0].id, ...result.rows[0] };
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      store_id: 'store_id',
      code: 'code',
      name: 'name',
      description: 'description',
      type: 'type',
      discount_type: 'discount_type',
      discount_value: 'discount_value',
      bundle_product_id: 'bundle_product_id',
      bundle_qty: 'bundle_qty',
      bundle_price: 'bundle_price',
      min_purchase: 'min_purchase',
      max_discount: 'max_discount',
      usage_limit: 'usage_limit',
      usage_per_user: 'usage_per_user',
      valid_from: 'valid_from',
      valid_until: 'valid_until',
      is_active: 'is_active'
    };

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${fieldMap[key]} = $${paramIndex++}`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE vouchers SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return result;
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM vouchers WHERE id = $1', [id]);
    return result;
  }

  static async incrementUsage(id) {
    const result = await pool.query(
      'UPDATE vouchers SET usage_count = usage_count + 1 WHERE id = $1',
      [id]
    );
    return result;
  }

  static async getUserUsageCount(voucherId, userId) {
    if (!userId) return 0;
    
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM voucher_usage WHERE voucher_id = $1 AND user_id = $2',
      [voucherId, userId]
    );
    return result.rows[0].count;
  }

  static async recordUsage(voucherId, userId = null, orderId = null) {
    const result = await pool.query(
      'INSERT INTO voucher_usage (voucher_id, user_id, order_id) VALUES ($1, $2, $3) RETURNING *',
      [voucherId, userId, orderId]
    );
    return result.rows[0];
  }
}

module.exports = VoucherModel;
