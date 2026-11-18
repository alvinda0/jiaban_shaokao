const VoucherService = require('../services/voucher.service');
const { success, error } = require('../utils/response');

// GET /api/vouchers
const getAll = async (req, res) => {
  try {
    const { role, store_id: userStoreId } = req.user;
    let { store_id } = req.query;
    
    // Non-superuser can only see their own store vouchers
    if (role !== 'superuser') {
      store_id = userStoreId;
    }
    
    const vouchers = await VoucherService.getAllVouchers(store_id);
    return success(res, vouchers, 'Vouchers retrieved');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// GET /api/vouchers/:id
const getById = async (req, res) => {
  try {
    const { role, store_id: userStoreId } = req.user;
    const voucher = await VoucherService.getVoucherById(req.params.id);
    
    // Non-superuser can only view their own store vouchers
    if (role !== 'superuser' && voucher.store_id !== userStoreId) {
      return error(res, 'You can only access vouchers from your own store', 403);
    }
    
    return success(res, voucher, 'Voucher retrieved');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// POST /api/vouchers
const create = async (req, res) => {
  try {
    const { role, store_id: userStoreId } = req.user;
    
    // Non-superuser can only create vouchers for their own store
    if (role !== 'superuser' && req.body.store_id && req.body.store_id !== userStoreId) {
      return error(res, 'You can only create vouchers for your own store', 403);
    }
    
    // Set store_id to user's store if not superuser
    if (role !== 'superuser') {
      req.body.store_id = userStoreId;
    }
    
    const voucher = await VoucherService.createVoucher(req.body);
    return success(res, voucher, 'Voucher created', 201);
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// PUT /api/vouchers/:id
const update = async (req, res) => {
  try {
    const { role, store_id: userStoreId } = req.user;
    const voucher = await VoucherService.getVoucherById(req.params.id);
    
    // Non-superuser can only update their own store vouchers
    if (role !== 'superuser' && voucher.store_id !== userStoreId) {
      return error(res, 'You can only update vouchers from your own store', 403);
    }
    
    const updated = await VoucherService.updateVoucher(req.params.id, req.body);
    return success(res, updated, 'Voucher updated');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// DELETE /api/vouchers/:id
const deleteVoucher = async (req, res) => {
  try {
    const { role, store_id: userStoreId } = req.user;
    const voucher = await VoucherService.getVoucherById(req.params.id);
    
    // Non-superuser can only delete their own store vouchers
    if (role !== 'superuser' && voucher.store_id !== userStoreId) {
      return error(res, 'You can only delete vouchers from your own store', 403);
    }
    
    const result = await VoucherService.deleteVoucher(req.params.id);
    return success(res, result, 'Voucher deleted');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// POST /api/vouchers/validate - Public endpoint to validate voucher
const validate = async (req, res) => {
  try {
    const { code, cart, user_id } = req.body;
    
    if (!code || !cart) {
      return error(res, 'Voucher code and cart data are required', 400);
    }

    const result = await VoucherService.validateVoucher(code, cart, user_id);
    return success(res, result, 'Voucher is valid');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, deleteVoucher, validate };
