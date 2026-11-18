const CategoryModel = require('../models/category.model');

class CategoryService {
  static async getCategoriesByStore(store_id, asTree = false) {
    const categories = await CategoryModel.findByStore(store_id);
    
    if (asTree) {
      return CategoryModel.buildTree(categories);
    }
    
    return categories;
  }

  static async getParentCategories(store_id) {
    return await CategoryModel.findParentsByStore(store_id);
  }

  static async getSubcategories(parent_id) {
    return await CategoryModel.findByParent(parent_id);
  }

  static async getCategoryById(id, store_id) {
    const category = await CategoryModel.findById(id);
    
    if (!category || category.store_id !== store_id) {
      return null;
    }
    
    return category;
  }

  static async createCategory(data) {
    const { store_id, parent_id, name, sort_order, is_active } = data;

    if (parent_id) {
      const parent = await CategoryModel.findById(parent_id);
      if (!parent || parent.store_id !== store_id) {
        throw new Error('Parent category not found or belongs to different store');
      }
    }

    const result = await CategoryModel.create({
      store_id,
      parent_id,
      name,
      sort_order,
      is_active
    });

    return await CategoryModel.findById(result.insertId);
  }

  static async updateCategory(id, store_id, data) {
    const category = await this.getCategoryById(id, store_id);
    
    if (!category) {
      throw new Error('Category not found');
    }

    const { name, parent_id, sort_order, is_active } = data;

    if (parent_id && parent_id !== category.parent_id) {
      if (parent_id === id) {
        throw new Error('Category cannot be its own parent');
      }

      const parent = await CategoryModel.findById(parent_id);
      if (!parent || parent.store_id !== store_id) {
        throw new Error('Parent category not found or belongs to different store');
      }

      if (parent.parent_id === id) {
        throw new Error('Cannot set child category as parent');
      }
    }

    await CategoryModel.update(id, {
      name: name !== undefined ? name : category.name,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order,
      is_active: is_active !== undefined ? is_active : category.is_active
    });

    return await CategoryModel.findById(id);
  }

  static async deleteCategory(id, store_id) {
    const category = await this.getCategoryById(id, store_id);
    
    if (!category) {
      throw new Error('Category not found');
    }

    const hasChildren = await CategoryModel.hasChildren(id);
    if (hasChildren) {
      throw new Error('Cannot delete category with subcategories');
    }

    const hasProducts = await CategoryModel.hasProducts(id);
    if (hasProducts) {
      throw new Error('Cannot delete category with products');
    }

    await CategoryModel.remove(id);
    return true;
  }
}

module.exports = CategoryService;
