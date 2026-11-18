const { pool } = require('../config/db');

class CategoryModel {
  // Get all categories by store (hierarchical)
  static async findByStore(store_id) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE store_id = $1 ORDER BY parent_id, sort_order, name`,
      [store_id]
    );
    return result.rows;
  }

  // Get parent categories only (parent_id IS NULL)
  static async findParentsByStore(store_id) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE store_id = $1 AND parent_id IS NULL ORDER BY sort_order, name`,
      [store_id]
    );
    return result.rows;
  }

  // Get subcategories by parent
  static async findByParent(parent_id) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE parent_id = $1 ORDER BY sort_order, name`,
      [parent_id]
    );
    return result.rows;
  }

  // Get single category by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM categories WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Create category
  static async create({ store_id, parent_id, name, sort_order, is_active }) {
    const result = await pool.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order, is_active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [store_id, parent_id || null, name, sort_order || 0, is_active !== undefined ? is_active : true]
    );
    return result.rows[0];
  }

  // Update category
  static async update(id, { name, parent_id, sort_order, is_active }) {
    const result = await pool.query(
      `UPDATE categories SET name = $1, parent_id = $2, sort_order = $3, is_active = $4 WHERE id = $5`,
      [name, parent_id || null, sort_order, is_active, id]
    );
    return result;
  }

  // Delete category
  static async remove(id) {
    const result = await pool.query(
      `DELETE FROM categories WHERE id = $1`,
      [id]
    );
    return result;
  }

  // Check if category has children
  static async hasChildren(id) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM categories WHERE parent_id = $1`,
      [id]
    );
    return result.rows[0].count > 0;
  }

  // Check if category has products
  static async hasProducts(id) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM products WHERE category_id = $1`,
      [id]
    );
    return result.rows[0].count > 0;
  }

  // Build hierarchical tree
  static buildTree(flatCategories) {
    const map = {};
    const tree = [];

    // Create map
    flatCategories.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    // Build tree
    flatCategories.forEach(cat => {
      if (cat.parent_id) {
        if (map[cat.parent_id]) {
          map[cat.parent_id].children.push(map[cat.id]);
        }
      } else {
        tree.push(map[cat.id]);
      }
    });

    return tree;
  }
}

module.exports = CategoryModel;
