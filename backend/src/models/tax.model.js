const { pool } = require('../config/db');

class TaxModel {
  // Get all tax rules by store
  static async findByStore(store_id) {
    const result = await pool.query(
      `SELECT * FROM tax_rules WHERE store_id = $1 ORDER BY code`,
      [store_id]
    );
    return result.rows;
  }

  // Get active tax rules by store (all fields)
  static async findActiveByStore(store_id) {
    const result = await pool.query(
      `SELECT * FROM tax_rules WHERE store_id = $1 AND is_active = true ORDER BY code`,
      [store_id]
    );
    return result.rows;
  }

  // Get single tax rule by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM tax_rules WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get tax rule by code (PB1 or SC)
  static async findByCode(store_id, code) {
    const result = await pool.query(
      `SELECT * FROM tax_rules WHERE store_id = $1 AND code = $2`,
      [store_id, code]
    );
    return result.rows[0];
  }

  // Public: hanya aturan aktif, field terbatas
static async findActiveByStoreForPublic(store_id) {
  const result = await pool.query(
    `SELECT id, code, name, rate, apply_dine_in, apply_take_away,
            apply_delivery, include_sc_in_base
     FROM tax_rules
     WHERE store_id = $1 AND is_active = true
     ORDER BY code`,
    [store_id]
  );
  return result.rows;
}

  // Create tax rule
  static async create(data) {
    const {
      store_id,
      code,
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    } = data;

    const result = await pool.query(
      `INSERT INTO tax_rules 
       (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        store_id,
        code,
        name,
        rate,
        apply_dine_in !== undefined ? apply_dine_in : true,
        apply_take_away !== undefined ? apply_take_away : true,
        apply_delivery !== undefined ? apply_delivery : true,
        include_sc_in_base !== undefined ? include_sc_in_base : false,
        is_active !== undefined ? is_active : true,
      ]
    );
    return result.rows[0];
  }

  // Update tax rule
  static async update(id, data) {
    const {
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    } = data;

    const result = await pool.query(
      `UPDATE tax_rules 
       SET name = $1, rate = $2, apply_dine_in = $3, apply_take_away = $4, 
           apply_delivery = $5, include_sc_in_base = $6, is_active = $7
       WHERE id = $8`,
      [name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base, is_active, id]
    );
    return result;
  }

  // Delete tax rule
  static async remove(id) {
    const result = await pool.query(
      `DELETE FROM tax_rules WHERE id = $1`,
      [id]
    );
    return result;
  }

  // Check if tax rule is used in orders
  static async isUsedInOrders(id) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM order_taxes WHERE tax_rule_id = $1`,
      [id]
    );
    return result.rows[0].count > 0;
  }
}

module.exports = TaxModel;
