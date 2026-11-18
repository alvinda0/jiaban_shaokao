const VariantModel = require('../models/variant.model');
const ProductModel = require('../models/product.model');

class VariantService {

  static async createVariantGroup(productId, groupData, optionsData) {
    const product = await ProductModel.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!groupData.name || groupData.name.trim() === '') {
      throw new Error('Variant group name is required');
    }

    if (optionsData && optionsData.length > 0) {
      for (let option of optionsData) {
        if (!option.name || option.name.trim() === '') {
          throw new Error('Option name is required');
        }
      }
    }

    const groupId = await VariantModel.createVariantGroupWithOptions(
      productId,
      groupData,
      optionsData
    );

    const group = await VariantModel.getVariantGroupById(groupId);
    group.options = await VariantModel.getVariantOptionsByGroup(groupId);

    return group;
  }


  static async getProductVariants(productId) {
    const product = await ProductModel.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    return await VariantModel.getProductVariants(productId);
  }


  static async updateVariantGroup(groupId, groupData) {
    const group = await VariantModel.getVariantGroupById(groupId);
    if (!group) {
      throw new Error('Variant group not found');
    }

    if (groupData.name && groupData.name.trim() === '') {
      throw new Error('Variant group name cannot be empty');
    }

    const success = await VariantModel.updateVariantGroup(groupId, groupData);
    
    if (!success) {
      throw new Error('Failed to update variant group');
    }

    return await VariantModel.getVariantGroupById(groupId);
  }


  static async deleteVariantGroup(groupId) {
    const group = await VariantModel.getVariantGroupById(groupId);
    if (!group) {
      throw new Error('Variant group not found');
    }

    const success = await VariantModel.deleteVariantGroup(groupId);
    
    if (!success) {
      throw new Error('Failed to delete variant group');
    }

    return true;
  }


  static async createVariantOption(groupId, optionData) {
    const group = await VariantModel.getVariantGroupById(groupId);
    if (!group) {
      throw new Error('Variant group not found');
    }

    if (!optionData.name || optionData.name.trim() === '') {
      throw new Error('Option name is required');
    }

    const optionId = await VariantModel.createVariantOption({
      variant_group_id: groupId,
      ...optionData
    });

    return await VariantModel.getVariantOptionById(optionId);
  }


  static async updateVariantOption(optionId, optionData) {
    const option = await VariantModel.getVariantOptionById(optionId);
    if (!option) {
      throw new Error('Variant option not found');
    }


    if (optionData.name && optionData.name.trim() === '') {
      throw new Error('Option name cannot be empty');
    }

    const success = await VariantModel.updateVariantOption(optionId, optionData);
    
    if (!success) {
      throw new Error('Failed to update variant option');
    }

    return await VariantModel.getVariantOptionById(optionId);
  }


  static async deleteVariantOption(optionId) {
    const option = await VariantModel.getVariantOptionById(optionId);
    if (!option) {
      throw new Error('Variant option not found');
    }

    const success = await VariantModel.deleteVariantOption(optionId);
    
    if (!success) {
      throw new Error('Failed to delete variant option');
    }

    return true;
  }


  static async bulkUpdateOptions(groupId, optionsData) {
    const group = await VariantModel.getVariantGroupById(groupId);
    if (!group) {
      throw new Error('Variant group not found');
    }

    if (optionsData && optionsData.length > 0) {
      for (let option of optionsData) {
        if (!option.name || option.name.trim() === '') {
          throw new Error('All options must have a name');
        }
      }
    }

    await VariantModel.bulkUpdateOptions(groupId, optionsData);

    return await VariantModel.getVariantOptionsByGroup(groupId);
  }


  static async deleteProductVariants(productId) {
    const product = await ProductModel.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const deletedCount = await VariantModel.deleteProductVariants(productId);
    
    return deletedCount;
  }
}

module.exports = VariantService;
