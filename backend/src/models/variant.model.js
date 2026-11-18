const { pool } = require('../config/db');

class VariantModel {
  // ==================== VARIANT GROUPS ====================
  
  /**
   * Create a new variant group for a product
   */
  static async createVariantGroup(groupData) {
    const { product_id, name, is_required, min_select, max_select, sort_order } = groupData;
    
    const result = await pool.query(
      `INSERT INTO variant_groups (product_id, name, is_required, min_select, max_select, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [product_id, name, is_required || false, min_select || 0, max_select || 1, sort_order || 0]
    );
    
    return result.rows[0].id;
  }

  /**
   * Get all variant groups for a product
   */
  static async getVariantGroupsByProduct(productId) {
    const result = await pool.query(
      `SELECT * FROM variant_groups 
       WHERE product_id = $1 
       ORDER BY sort_order ASC, created_at ASC`,
      [productId]
    );
    
    return result.rows;
  }

  /**
   * Get variant group by ID
   */
  static async getVariantGroupById(groupId) {
    const result = await pool.query(
      `SELECT * FROM variant_groups WHERE id = $1`,
      [groupId]
    );
    
    return result.rows[0];
  }

  /**
   * Update variant group
   */
  static async updateVariantGroup(groupId, groupData) {
    const { name, is_required, min_select, max_select, sort_order } = groupData;
    
    const result = await pool.query(
      `UPDATE variant_groups 
       SET name = $1, is_required = $2, min_select = $3, max_select = $4, sort_order = $5
       WHERE id = $6`,
      [name, is_required, min_select, max_select, sort_order, groupId]
    );
    
    return result.rowCount > 0;
  }

  /**
   * Delete variant group (will cascade delete options)
   */
  static async deleteVariantGroup(groupId) {
    const result = await pool.query(
      `DELETE FROM variant_groups WHERE id = $1`,
      [groupId]
    );
    
    return result.rowCount > 0;
  }

  // ==================== VARIANT OPTIONS ====================

  /**
   * Create a new variant option
   */
  static async createVariantOption(optionData) {
    const { variant_group_id, name, price_adjustment, is_default, is_active, sort_order } = optionData;
    
    const result = await pool.query(
      `INSERT INTO variant_options (variant_group_id, name, price_adjustment, is_default, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [variant_group_id, name, price_adjustment || 0, is_default || false, is_active !== false ? true : false, sort_order || 0]
    );
    
    return result.rows[0].id;
  }

  /**
   * Get all variant options for a group
   */
  static async getVariantOptionsByGroup(groupId) {
    const result = await pool.query(
      `SELECT * FROM variant_options 
       WHERE variant_group_id = $1 
       ORDER BY sort_order ASC, created_at ASC`,
      [groupId]
    );
    
    return result.rows;
  }

  /**
   * Get variant option by ID
   */
  static async getVariantOptionById(optionId) {
    const result = await pool.query(
      `SELECT * FROM variant_options WHERE id = $1`,
      [optionId]
    );
    
    return result.rows[0];
  }

  /**
   * Update variant option
   */
  static async updateVariantOption(optionId, optionData) {
    const { name, price_adjustment, is_default, is_active, sort_order } = optionData;
    
    const result = await pool.query(
      `UPDATE variant_options 
       SET name = $1, price_adjustment = $2, is_default = $3, is_active = $4, sort_order = $5
       WHERE id = $6`,
      [name, price_adjustment, is_default, is_active, sort_order, optionId]
    );
    
    return result.rowCount > 0;
  }

  /**
   * Delete variant option
   */
  static async deleteVariantOption(optionId) {
    const result = await pool.query(
      `DELETE FROM variant_options WHERE id = $1`,
      [optionId]
    );
    
    return result.rowCount > 0;
  }

  // ==================== COMBINED QUERIES ====================

  /**
   * Get product with all variants (groups and options)
   */
  static async getProductVariants(productId) {
    const groups = await this.getVariantGroupsByProduct(productId);
    
    // For each group, get its options
    for (let group of groups) {
      group.options = await this.getVariantOptionsByGroup(group.id);
    }
    
    return groups;
  }

  /**
   * Create variant group with options in one transaction
   */
  static async createVariantGroupWithOptions(productId, groupData, optionsData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create group
      const groupResult = await client.query(
        `INSERT INTO variant_groups (product_id, name, is_required, min_select, max_select, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          productId,
          groupData.name,
          groupData.is_required || false,
          groupData.min_select || 0,
          groupData.max_select || 1,
          groupData.sort_order || 0
        ]
      );
      
      const groupId = groupResult.rows[0].id;
      
      if (!groupId) {
        throw new Error('Failed to get created group ID');
      }
      
      // Create options if provided
      if (optionsData && optionsData.length > 0) {
        for (let option of optionsData) {
          await client.query(
            `INSERT INTO variant_options (variant_group_id, name, price_adjustment, is_default, is_active, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              groupId,
              option.name,
              option.price_adjustment || 0,
              option.is_default || false,
              option.is_active !== false ? true : false,
              option.sort_order || 0
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      return groupId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete all variants for a product
   */
  static async deleteProductVariants(productId) {
    const result = await pool.query(
      `DELETE FROM variant_groups WHERE product_id = $1`,
      [productId]
    );
    
    return result.rowCount;
  }

  /**
   * Bulk update variant options for a group
   */
  static async bulkUpdateOptions(groupId, optionsData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete existing options
      await client.query(
        `DELETE FROM variant_options WHERE variant_group_id = $1`,
        [groupId]
      );
      
      // Insert new options
      if (optionsData && optionsData.length > 0) {
        for (let option of optionsData) {
          await client.query(
            `INSERT INTO variant_options (variant_group_id, name, price_adjustment, is_default, is_active, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              groupId,
              option.name,
              option.price_adjustment || 0,
              option.is_default || false,
              option.is_active !== false ? true : false,
              option.sort_order || 0
            ]
          );
        }
      }
      
      await client.query('COMMIT');
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = VariantModel;
