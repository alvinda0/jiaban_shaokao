const TaxModel = require('../models/tax.model');

class TaxService {
  static async getTaxRulesByStore(store_id) {
    return await TaxModel.findByStore(store_id);
  }

  static async getActiveTaxRules(store_id) {
    return await TaxModel.findActiveByStore(store_id);
  }

  static async getTaxRuleById(id, store_id) {
    const taxRule = await TaxModel.findById(id);
    
    if (!taxRule || taxRule.store_id !== store_id) {
      return null;
    }
    
    return taxRule;
  }

  static async createTaxRule(data) {
    const { store_id, code, name, rate } = data;

    if (!code || !name || rate === undefined) {
      throw new Error('Code, name, and rate are required');
    }

    if (!['PB1', 'SC'].includes(code)) {
      throw new Error('Code must be PB1 or SC');
    }

    if (rate < 0 || rate > 100) {
      throw new Error('Rate must be between 0 and 100');
    }

    const existing = await TaxModel.findByCode(store_id, code);
    if (existing) {
      throw new Error(`Tax rule with code ${code} already exists for this store`);
    }

    const result = await TaxModel.create(data);
    return await TaxModel.findById(result.insertId);
  }

  static async updateTaxRule(id, store_id, data) {
    const taxRule = await this.getTaxRuleById(id, store_id);
    
    if (!taxRule) {
      throw new Error('Tax rule not found');
    }

    const { name, rate } = data;

    if (rate !== undefined && (rate < 0 || rate > 100)) {
      throw new Error('Rate must be between 0 and 100');
    }

    await TaxModel.update(id, {
      name: name !== undefined ? name : taxRule.name,
      rate: rate !== undefined ? rate : taxRule.rate,
      apply_dine_in: data.apply_dine_in !== undefined ? data.apply_dine_in : taxRule.apply_dine_in,
      apply_take_away: data.apply_take_away !== undefined ? data.apply_take_away : taxRule.apply_take_away,
      apply_delivery: data.apply_delivery !== undefined ? data.apply_delivery : taxRule.apply_delivery,
      include_sc_in_base: data.include_sc_in_base !== undefined ? data.include_sc_in_base : taxRule.include_sc_in_base,
      is_active: data.is_active !== undefined ? data.is_active : taxRule.is_active,
    });

    return await TaxModel.findById(id);
  }

  static async deleteTaxRule(id, store_id) {
    const taxRule = await this.getTaxRuleById(id, store_id);
    
    if (!taxRule) {
      throw new Error('Tax rule not found');
    }

    const isUsed = await TaxModel.isUsedInOrders(id);
    if (isUsed) {
      throw new Error('Cannot delete tax rule that is used in orders. Set to inactive instead.');
    }

    await TaxModel.remove(id);
    return true;
  }

  static async getPublicTaxRules(store_id, order_type) {
  const rules = await TaxModel.findActiveByStoreForPublic(store_id);

  const fieldMap = {
    dine_in: 'apply_dine_in',
    take_away: 'apply_take_away',
    delivery: 'apply_delivery',
  };

  if (order_type) {
    const field = fieldMap[order_type];
    if (!field) throw new Error('order_type must be dine_in, take_away, or delivery');
    return rules.filter((r) => r[field]);
  }
  return rules;
}
}

module.exports = TaxService;
