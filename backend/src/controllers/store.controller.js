const StoreService = require('../services/store.service');
const supabase = require('../config/supabase');
const { success, error } = require('../utils/response');

// GET /api/stores
const getAll = async (req, res) => {
  try {
    const { role, store_id } = req.user;
    
    // Non-superuser only gets their own store
    if (role !== 'superuser' && store_id) {
      const store = await StoreService.getStoreById(store_id);
      return success(res, [store], 'Stores retrieved');
    }
    
    // Superuser gets all stores
    const stores = await StoreService.getAllStores();
    return success(res, stores, 'Stores retrieved');
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return error(res, err.message || 'Internal Server Error', status);
  }
};

// GET /api/stores/:id
const getById = async (req, res) => {
  try {
    const store = await StoreService.getStoreById(req.params.id);
    return success(res, store, 'Store retrieved');
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return error(res, err.message || 'Internal Server Error', status);
  }
};

// POST /api/stores
const create = async (req, res) => {
  try {
    const { name, address, phone, logo_url } = req.body;
    const store = await StoreService.createStore({ name, address, phone, logo_url });
    return success(res, store, 'Store created', 201);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return error(res, err.message || 'Internal Server Error', status);
  }
};

// PUT /api/stores/:id
const update = async (req, res) => {
  try {
    const { name, address, phone, logo_url, is_active } = req.body;
    const store = await StoreService.updateStore(req.params.id, {
      name,
      address,
      phone,
      logo_url,
      is_active
    });
    return success(res, store, 'Store updated');
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return error(res, err.message || 'Internal Server Error', status);
  }
};

// DELETE /api/stores/:id
const deleteStore = async (req, res) => {
  try {
    const result = await StoreService.deleteStore(req.params.id);
    return success(res, result, 'Store deleted');
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    return error(res, err.message || 'Internal Server Error', status);
  }
};

// POST /api/stores/upload-logo - Upload logo ke Supabase
const uploadLogo = async (req, res) => {
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

    // Upload ke Supabase Storage bucket: logo_shaokao
    const { data, error: uploadError } = await supabase.storage
      .from('logo_shaokao')
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
      .from('logo_shaokao')
      .getPublicUrl(fileName);

    return success(res, { imageUrl: publicUrl }, 'Logo uploaded');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

module.exports = { getAll, getById, create, update, deleteStore, uploadLogo };
