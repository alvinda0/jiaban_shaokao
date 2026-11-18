const { pool } = require('../config/db');

class ProductModel {
  // Check if product name exists in store
  static async existsByName(store_id, name, exclude_id = null) {
    let query = `SELECT id FROM products WHERE store_id = $1 AND LOWER(name) = LOWER($2)`;
    const params = [store_id, name];
    
    if (exclude_id) {
      query += ` AND id != $3`;
      params.push(exclude_id);
    }
    
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  // Get all products by store
  static async findByStore(store_id) {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.store_id = $1 
       ORDER BY c.name, p.sort_order, p.name`,
      [store_id]
    );
    return result.rows;
  }

  // Get products by category
  static async findByCategory(category_id) {
    const result = await pool.query(
      `SELECT * FROM products WHERE category_id = $1 ORDER BY sort_order, name`,
      [category_id]
    );
    return result.rows;
  }

  // Get single product
  static async findById(id) {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get low stock products
  static async findLowStock(store_id) {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.store_id = $1 AND p.track_stock = true AND p.stock_qty <= p.min_stock
       ORDER BY p.stock_qty ASC`,
      [store_id]
    );
    return result.rows;
  }

  // Create product
  static async create(data) {
    const {
      store_id,
      category_id,
      sku,
      name,
      description,
      image_url,
      price,
      cost_price,
      track_stock,
      stock_qty,
      min_stock,
      is_available,
      is_active,
      sort_order,
    } = data;

    const result = await pool.query(
      `INSERT INTO products 
       (store_id, category_id, sku, name, description, image_url, price, cost_price, 
        track_stock, stock_qty, min_stock, is_available, is_active, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        store_id,
        category_id,
        sku || null,
        name,
        description || null,
        image_url || null,
        price,
        cost_price || 0,
        track_stock !== undefined ? track_stock : false,
        stock_qty || 0,
        min_stock || 0,
        is_available !== undefined ? is_available : true,
        is_active !== undefined ? is_active : true,
        sort_order || 0,
      ]
    );
    
    return result.rows[0];
  }

  // Update product
  static async update(id, data) {
    const {
      category_id,
      sku,
      name,
      description,
      image_url,
      price,
      cost_price,
      track_stock,
      stock_qty,
      min_stock,
      is_available,
      is_active,
      sort_order,
    } = data;

    const result = await pool.query(
      `UPDATE products 
       SET category_id = $1, sku = $2, name = $3, description = $4, image_url = $5, 
           price = $6, cost_price = $7, track_stock = $8, stock_qty = $9, min_stock = $10,
           is_available = $11, is_active = $12, sort_order = $13
       WHERE id = $14`,
      [
        category_id,
        sku || null,
        name,
        description,
        image_url,
        price,
        cost_price,
        track_stock,
        stock_qty,
        min_stock,
        is_available,
        is_active,
        sort_order,
        id,
      ]
    );
    return result;
  }

  // Update stock only
  static async updateStock(id, stock_qty) {
    const result = await pool.query(
      `UPDATE products SET stock_qty = $1 WHERE id = $2`,
      [stock_qty, id]
    );
    return result;
  }

  // Reduce stock atomically with validation (fail if insufficient)
  static async reduceStockAtomic(id, quantity) {
    const result = await pool.query(
      `UPDATE products 
       SET stock_qty = stock_qty - $1 
       WHERE id = $2 AND track_stock = true AND stock_qty >= $1
       RETURNING stock_qty`,
      [quantity, id]
    );
    
    // Return false if stock was insufficient (no rows updated)
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  // Reduce stock (for sales/orders)
  static async reduceStock(id, quantity) {
    const result = await pool.query(
      `UPDATE products 
       SET stock_qty = stock_qty - $1 
       WHERE id = $2 AND track_stock = true 
       RETURNING stock_qty`,
      [quantity, id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Product not found or does not track stock');
    }
    
    return result.rows[0];
  }

  // Increase stock (for restocking)
  static async increaseStock(id, quantity) {
    const result = await pool.query(
      `UPDATE products 
       SET stock_qty = stock_qty + $1 
       WHERE id = $2 AND track_stock = true 
       RETURNING stock_qty`,
      [quantity, id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Product not found or does not track stock');
    }
    
    return result.rows[0];
  }

  // Delete product
  static async remove(id) {
    const result = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    return result;
  }

  // Check if product is used in orders
  static async isUsedInOrders(id) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM order_items WHERE product_id = $1`,
      [id]
    );
    return result.rows[0].count > 0;
  }

  // Check if product has stock movements
  static async hasStockMovements(id) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM stock_movements WHERE product_id = $1`,
      [id]
    );
    return result.rows[0].count > 0;
  }

  // Add stock movement history
  static async addStockMovement(data) {
    const { store_id, product_id, type, quantity, reference_type, reference_id, notes, created_by } = data;

    // Get current stock
    const product = await this.findById(product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    const qty_change = quantity; // Can be positive or negative
    const qty_after = parseFloat(product.stock_qty) + qty_change;

    const result = await pool.query(
      `INSERT INTO stock_movements 
       (store_id, product_id, type, qty_change, qty_after, reference_type, reference_id, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [store_id, product_id, type, qty_change, qty_after, reference_type || null, reference_id || null, notes || null, created_by || null]
    );
    return result.rows[0];
  }

  // Get stock movement history
  static async getStockHistory(product_id, limit = 50) {
    const result = await pool.query(
      `SELECT sm.*, u.name as created_by_name 
       FROM stock_movements sm 
       LEFT JOIN users u ON sm.created_by = u.id 
       WHERE sm.product_id = $1 
       ORDER BY sm.created_at DESC 
       LIMIT $2`,
      [product_id, limit]
    );
    return result.rows;
  }
}

module.exports = ProductModel;
