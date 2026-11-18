const { pool } = require('../config/db');

class StoreModel {
  /**
   * Find all stores
   */
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM stores ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Find store by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find active stores only
   */
  static async findActive() {
    const result = await pool.query(
      'SELECT * FROM stores WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  }

  /**
   * Create new store
   */
  static async create({ name, address, phone, logo_url }) {
    const result = await pool.query(
      'INSERT INTO stores (name, address, phone, logo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, address || null, phone || null, logo_url || null]
    );
    return result.rows[0];
  }

  /**
   * Update store
   */
  static async update(id, { name, address, phone, logo_url, is_active }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (logo_url !== undefined) {
      fields.push(`logo_url = $${paramIndex++}`);
      values.push(logo_url);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE stores SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return result;
  }

  /**
   * Delete store
   */
  static async delete(id) {
    const result = await pool.query('DELETE FROM stores WHERE id = $1', [id]);
    return result;
  }
}

module.exports = StoreModel;
