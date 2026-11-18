const TaxService = require('../services/tax.service');
const { success, error } = require('../utils/response');

// GET /api/stores/:storeId/taxes
const getByStore = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const activeOnly = req.query.active_only === 'true';
    
    let taxRules;
    if (activeOnly) {
      taxRules = await TaxService.getActiveTaxRules(store_id);
    } else {
      taxRules = await TaxService.getTaxRulesByStore(store_id);
    }
    
    return success(res, taxRules, 'Tax rules retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// GET /api/stores/:storeId/taxes/:id
const getById = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const taxRule = await TaxService.getTaxRuleById(id, storeId);
    
    if (!taxRule) {
      return error(res, 'Tax rule not found', 404);
    }
    
    return success(res, taxRule, 'Tax rule retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// POST /api/stores/:storeId/taxes
// Body: { code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base, is_active }
const create = async (req, res) => {
  try {
    const store_id = req.params.storeId;
    const {
      code,
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    } = req.body;

    const taxRule = await TaxService.createTaxRule({
      store_id,
      code,
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    });

    return success(res, taxRule, 'Tax rule created', 201);
  } catch (err) {
    console.error(err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'Tax rule with this code already exists', 409);
    }
    
    if (err.message.includes('required') || err.message.includes('must be')) {
      return error(res, err.message, 400);
    }
    
    return error(res, 'Internal Server Error', 500);
  }
};

// PUT /api/stores/:storeId/taxes/:id
const update = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    const {
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    } = req.body;

    const taxRule = await TaxService.updateTaxRule(id, storeId, {
      name,
      rate,
      apply_dine_in,
      apply_take_away,
      apply_delivery,
      include_sc_in_base,
      is_active,
    });

    return success(res, taxRule, 'Tax rule updated');
  } catch (err) {
    console.error(err);
    
    if (err.message === 'Tax rule not found') {
      return error(res, err.message, 404);
    }
    
    if (err.message.includes('must be')) {
      return error(res, err.message, 400);
    }
    
    return error(res, 'Internal Server Error', 500);
  }
};

// DELETE /api/stores/:storeId/taxes/:id
const remove = async (req, res) => {
  try {
    const { storeId, id } = req.params;
    
    await TaxService.deleteTaxRule(id, storeId);
    
    return success(res, null, 'Tax rule deleted');
  } catch (err) {
    console.error(err);
    
    if (err.message === 'Tax rule not found') {
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
  getById,
  create,
  update,
  remove,
};
