  const { pool } = require('../config/db');

class UserModel {
  /**
   * Find user by email with role info
   */
  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID with role info
   */
  static async findById(id) {
    const result = await pool.query(
      `SELECT u.*, r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all users by store ID
   */
  static async findByStoreId(storeId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
              r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.store_id = $1
       ORDER BY u.created_at DESC`,
      [storeId]
    );
    return result.rows;
  }

  /**
   * Find all users (for superuser)
   */
  static async findAll() {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.store_id, u.is_active, u.created_at,
              r.name AS role_name,
              s.name AS store_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN stores s ON u.store_id = s.id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }

  /**
   * Create new user
   */
  static async create({ name, email, password, role_id, store_id = null }) {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role_id, store_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, password, role_id, store_id]
    );
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, { name, email, password, role_id, store_id, is_active }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      values.push(password);
    }
    if (role_id !== undefined) {
      fields.push(`role_id = $${paramIndex++}`);
      values.push(role_id);
    }
    if (store_id !== undefined) {
      fields.push(`store_id = $${paramIndex++}`);
      values.push(store_id);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return result;
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return result;
  }

  /**
   * Update password
   */
  static async updatePassword(id, hashedPassword) {
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
    return result;
  }
}

module.exports = UserModel;
