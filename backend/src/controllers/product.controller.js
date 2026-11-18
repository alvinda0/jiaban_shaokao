const ProductService = require('../services/product.service');
const { success, error } = require('../utils/response');
const supabase = require('../config/supabase');

const getByStore = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const products = await ProductService.getProductsByStore(store_id);

    return success(res, products, 'Products retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getPublicMenu = async (req, res) => {
  try {
    const { store_id } = req.query;

    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }

    const products = await ProductService.getPublicMenu(store_id);
    return success(res, products, 'Products retrieved successfully');
  } catch (err) {
    console.error('Public menu error:', err);
    return error(res, 'Failed to fetch products', 500);
  }
};

const getLowStock = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const products = await ProductService.getLowStockProducts(store_id);

    return success(res, products, 'Low stock products retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getById = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const product = await ProductService.getProductById(id, storeId);

    if (!product) {
      return error(res, 'Product not found', 404);
    }

    return success(res, product, 'Product retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getStockHistory = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const history = await ProductService.getStockHistory(id, storeId);

    return success(res, history, 'Stock history retrieved');
  } catch (err) {
    console.error(err);

    if (err.message === 'Product not found') {
      return error(res, err.message, 404);
    }

    return error(res, 'Internal Server Error', 500);
  }
};

const create = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const user_id = req.user?.id;

    const product = await ProductService.createProduct({
      ...req.body,
      store_id,
      created_by: user_id,
    });

    return success(res, product, 'Product created', 201);
  } catch (err) {
    console.error(err);

    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return error(res, 'SKU already exists', 409);
    }

    if (err.message.includes('already exists')) {
      return error(res, err.message, 409);
    }

    if (err.message.includes('required') || err.message.includes('cannot')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Internal Server Error', 500);
  }
};

const update = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const user_id = req.user?.id;

    const product = await ProductService.updateProduct(id, storeId, req.body, user_id);

    return success(res, product, 'Product updated');
  } catch (err) {
    console.error(err);

    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return error(res, 'SKU already exists', 409);
    }

    if (err.message.includes('already exists')) {
      return error(res, err.message, 409);
    }

    if (err.message === 'Product not found') {
      return error(res, err.message, 404);
    }

    if (err.message.includes('cannot')) {
      return error(res, err.message, 400);
    }

    return error(res, err.message || 'Internal Server Error', 500);
  }
};


const adjustStock = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const user_id = req.user?.id;

    const product = await ProductService.adjustStock(id, storeId, req.body, user_id);

    return success(res, product, 'Stock adjusted');
  } catch (err) {
    console.error(err);

    if (err.message === 'Product not found') {
      return error(res, err.message, 404);
    }

    if (err.message.includes('required') || err.message.includes('Insufficient')) {
      return error(res, err.message, 400);
    }

    return error(res, 'Internal Server Error', 500);
  }
};

const remove = async (req, res) => {
  try {
    const { storeId, id } = req.params;

    await ProductService.deleteProduct(id, storeId);

    return success(res, null, 'Product deleted');
  } catch (err) {
    console.error(err);

    if (err.message === 'Product not found') {
      return error(res, err.message, 404);
    }

    if (err.message.includes('Cannot delete')) {
      return error(res, err.message, 400);
    }

    return error(res, 'Internal Server Error', 500);
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!supabase) {
      return error(res, 'Image upload is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env', 503);
    }

    if (!req.file) {
      return error(res, 'No image file uploaded', 400);
    }

    const file = req.file;
    const ext = file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;

    const { data, error: uploadError } = await supabase.storage
      .from('product_shaokao')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return error(res, 'Failed to upload image: ' + uploadError.message, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product_shaokao')
      .getPublicUrl(fileName);

    return success(res, { imageUrl: publicUrl }, 'Image uploaded');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

module.exports = {
  getByStore,
  getPublicMenu,
  getLowStock,
  getById,
  getStockHistory,
  create,
  update,
  adjustStock,
  remove,
  uploadImage,
};
