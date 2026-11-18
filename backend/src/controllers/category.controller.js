const CategoryService = require('../services/category.service');
const { success, error } = require('../utils/response');


const getByStore = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const asTree = req.query.tree === 'true';
    
    const categories = await CategoryService.getCategoriesByStore(store_id, asTree);
    
    return success(res, categories, 'Categories retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getParents = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const categories = await CategoryService.getParentCategories(store_id);
    
    return success(res, categories, 'Parent categories retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getById = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const category = await CategoryService.getCategoryById(id, storeId);
    
    if (!category) {
      return error(res, 'Category not found', 404);
    }
    
    return success(res, category, 'Category retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getSubcategories = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    
    // Verify parent exists and belongs to store
    const parent = await CategoryService.getCategoryById(id, storeId);
    if (!parent) {
      return error(res, 'Parent category not found', 404);
    }
    
    const subcategories = await CategoryService.getSubcategories(id);
    
    return success(res, subcategories, 'Subcategories retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};


const create = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const { name, parent_id, sort_order, is_active } = req.body;

    if (!name) {
      return error(res, 'Name is required', 400);
    }

    const category = await CategoryService.createCategory({
      store_id,
      name,
      parent_id,
      sort_order,
      is_active
    });

    return success(res, category, 'Category created', 201);
  } catch (err) {
    console.error(err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'Category name already exists', 409);
    }
    
    if (err.message.includes('Parent category')) {
      return error(res, err.message, 400);
    }
    
    return error(res, 'Internal Server Error', 500);
  }
};


const update = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const { name, parent_id, sort_order, is_active } = req.body;

    const category = await CategoryService.updateCategory(id, storeId, {
      name,
      parent_id,
      sort_order,
      is_active
    });

    return success(res, category, 'Category updated');
  } catch (err) {
    console.error(err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'Category name already exists', 409);
    }
    
    if (err.message === 'Category not found') {
      return error(res, err.message, 404);
    }
    
    if (err.message.includes('parent') || err.message.includes('child')) {
      return error(res, err.message, 400);
    }
    
    return error(res, 'Internal Server Error', 500);
  }
};

const remove = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    
    await CategoryService.deleteCategory(id, storeId);
    
    return success(res, null, 'Category deleted');
  } catch (err) {
    console.error(err);
    
    if (err.message === 'Category not found') {
      return error(res, err.message, 404);
    }
    
    if (err.message.includes('Cannot delete')) {
      return error(res, err.message, 400);
    }
    
    return error(res, 'Internal Server Error', 500);
  }
};

module.exports = {
  getByStore,
  getParents,
  getById,
  getSubcategories,
  create,
  update,
  remove
};
