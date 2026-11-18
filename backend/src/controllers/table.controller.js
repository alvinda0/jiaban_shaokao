const tableModel = require('../models/table.model');
const { success, error } = require('../utils/response');

// Public endpoint for getting tables by store_id (for customer QR order)
const getPublicTables = async (req, res) => {
  try {
    const { store_id } = req.query;
    
    if (!store_id) {
      return error(res, 'store_id is required', 400);
    }
    
    const tables = await tableModel.findByStore(store_id);
    return success(res, tables, 'Tables retrieved');
  } catch (err) {
    console.error('Get public tables error:', err);
    return error(res, 'Failed to fetch tables', 500);
  }
};

const getByStore = async (req, res) => {
  try {
    const tables = await tableModel.findByStore(req.params.storeId);
    
    // Group by type
    const grouped = {
      reguler: [],
      lantai2: [],
      takeaway: [],
      vvip: []
    };
    
    tables.forEach(t => {
      if (grouped[t.type]) {
        grouped[t.type].push(t);
      }
    });
    
    return success(res, { tables, grouped }, 'Tables retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const getById = async (req, res) => {
  try {
    const table = await tableModel.findById(req.params.id);
    if (!table || table.store_id !== req.params.storeId)
      return error(res, 'Table not found', 404);
    return success(res, table, 'Table retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const create = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const { number, type, qr_url, tables } = req.body;

    // Bulk create
    if (Array.isArray(tables) && tables.length > 0) {
      const results = [];
      for (const t of tables) {
        if (!t.number) continue;
        await tableModel.create({ 
          store_id, 
          number: t.number, 
          type: t.type || 'reguler',
          qr_url: t.qr_url 
        });
        results.push(t.number);
      }
      const all = await tableModel.findByStore(store_id);
      const grouped = {
        reguler: all.filter(t => t.type === 'reguler'),
        lantai2: all.filter(t => t.type === 'lantai2'),
        takeaway: all.filter(t => t.type === 'takeaway'),
        vvip: all.filter(t => t.type === 'vvip')
      };
      return success(res, { tables: all, grouped }, `${results.length} tables created`, 201);
    }

    // Single create
    if (!number) return error(res, 'number is required', 400);

    await tableModel.create({ store_id, number, type: type || 'reguler', qr_url });
    const all = await tableModel.findByStore(store_id);
    const grouped = {
      reguler: all.filter(t => t.type === 'reguler'),
      lantai2: all.filter(t => t.type === 'lantai2'),
      takeaway: all.filter(t => t.type === 'takeaway'),
      vvip: all.filter(t => t.type === 'vvip')
    };
    return success(res, { tables: all, grouped }, 'Table created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return error(res, 'Table number already exists in this store', 409);
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// PUT /api/stores/:storeId/tables/:id
const update = async (req, res) => {
  try {
    const table = await tableModel.findById(req.params.id);
    if (!table || table.store_id !== req.params.storeId)
      return error(res, 'Table not found', 404);

    const { number, type, qr_url, is_active } = req.body;
    if (!number) return error(res, 'number is required', 400);

    await tableModel.update(req.params.id, {
      number,
      type: type || table.type,
      qr_url,
      is_active: is_active !== undefined ? is_active : table.is_active,
    });

    const updated = await tableModel.findById(req.params.id);
    return success(res, updated, 'Table updated');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return error(res, 'Table number already exists in this store', 409);
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// POST /api/stores/:storeId/tables/:id/regenerate-qr
const regenerateQr = async (req, res) => {
  try {
    const table = await tableModel.findById(req.params.id);
    if (!table || table.store_id !== req.params.storeId)
      return error(res, 'Table not found', 404);

    const qr_token = await tableModel.regenerateToken(req.params.id);
    return success(res, { qr_token }, 'QR token regenerated');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// DELETE /api/stores/:storeId/tables/:id
const remove = async (req, res) => {
  try {
    const table = await tableModel.findById(req.params.id);
    if (!table || table.store_id !== req.params.storeId)
      return error(res, 'Table not found', 404);

    await tableModel.remove(req.params.id);
    return success(res, null, 'Table deleted');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

module.exports = { getPublicTables, getByStore, getById, create, update, regenerateQr, remove };
