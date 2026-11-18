const VariantService = require('../services/variant.service');
const { successResponse, errorResponse } = require('../utils/response');

class VariantController {
  /**
   * Create variant group with options
   * POST /api/products/:productId/variants
   */
  static async createVariantGroup(req, res) {
    try {
      const { productId } = req.params;
      const { group, options } = req.body;

      if (!group) {
        return errorResponse(res, 'Group data is required', 400);
      }

      const result = await VariantService.createVariantGroup(
        productId,
        group,
        options || []
      );

      return successResponse(res, result, 'Variant group created successfully', 201);
    } catch (error) {
      console.error('Create variant group error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Get all variants for a product
   * GET /api/products/:productId/variants
   */
  static async getProductVariants(req, res) {
    try {
      const { productId } = req.params;

      const variants = await VariantService.getProductVariants(productId);

      return successResponse(res, variants, 'Product variants retrieved successfully');
    } catch (error) {
      console.error('Get product variants error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Update variant group
   * PUT /api/variants/groups/:groupId
   */
  static async updateVariantGroup(req, res) {
    try {
      const { groupId } = req.params;
      const groupData = req.body;

      const result = await VariantService.updateVariantGroup(groupId, groupData);

      return successResponse(res, result, 'Variant group updated successfully');
    } catch (error) {
      console.error('Update variant group error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Delete variant group
   * DELETE /api/variants/groups/:groupId
   */
  static async deleteVariantGroup(req, res) {
    try {
      const { groupId } = req.params;

      await VariantService.deleteVariantGroup(groupId);

      return successResponse(res, null, 'Variant group deleted successfully');
    } catch (error) {
      console.error('Delete variant group error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Create variant option
   * POST /api/variants/groups/:groupId/options
   */
  static async createVariantOption(req, res) {
    try {
      const { groupId } = req.params;
      const optionData = req.body;

      const result = await VariantService.createVariantOption(groupId, optionData);

      return successResponse(res, result, 'Variant option created successfully', 201);
    } catch (error) {
      console.error('Create variant option error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Update variant option
   * PUT /api/variants/options/:optionId
   */
  static async updateVariantOption(req, res) {
    try {
      const { optionId } = req.params;
      const optionData = req.body;

      const result = await VariantService.updateVariantOption(optionId, optionData);

      return successResponse(res, result, 'Variant option updated successfully');
    } catch (error) {
      console.error('Update variant option error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Delete variant option
   * DELETE /api/variants/options/:optionId
   */
  static async deleteVariantOption(req, res) {
    try {
      const { optionId } = req.params;

      await VariantService.deleteVariantOption(optionId);

      return successResponse(res, null, 'Variant option deleted successfully');
    } catch (error) {
      console.error('Delete variant option error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Bulk update options for a group
   * PUT /api/variants/groups/:groupId/options
   */
  static async bulkUpdateOptions(req, res) {
    try {
      const { groupId } = req.params;
      const { options } = req.body;

      if (!Array.isArray(options)) {
        return errorResponse(res, 'Options must be an array', 400);
      }

      const result = await VariantService.bulkUpdateOptions(groupId, options);

      return successResponse(res, result, 'Options updated successfully');
    } catch (error) {
      console.error('Bulk update options error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * Delete all variants for a product
   * DELETE /api/products/:productId/variants
   */
  static async deleteProductVariants(req, res) {
    try {
      const { productId } = req.params;

      const deletedCount = await VariantService.deleteProductVariants(productId);

      return successResponse(
        res,
        { deleted_count: deletedCount },
        'Product variants deleted successfully'
      );
    } catch (error) {
      console.error('Delete product variants error:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = VariantController;
