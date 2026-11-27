const StoreModel = require('../models/store.model');

class StoreService {
 
  static async getAllStores() {
    return await StoreModel.findAll();
  }

 
  static async getActiveStores() {
    return await StoreModel.findActive();
  }

 
  static async getStoreById(id) {
    const store = await StoreModel.findById(id);
    if (!store) {
      throw { status: 404, message: 'Store not found' };
    }
    return store;
  }

 
  static async createStore(storeData) {
    const { name, address, phone, logo_url, timezone } = storeData;

    if (!name || name.trim() === '') {
      throw { status: 400, message: 'Store name is required' };
    }

    // Validate timezone format (optional - defaults to Asia/Jakarta)
    const tzRegex = /^[A-Za-z/_]+$/;
    if (timezone && !tzRegex.test(timezone)) {
      throw { status: 400, message: 'Invalid timezone format' };
    }

    const result = await StoreModel.create({ 
      name, 
      address, 
      phone, 
      logo_url,
      timezone: timezone || 'Asia/Jakarta'
    });
    return await StoreModel.findById(result.insertId);
  }

 
  static async updateStore(id, updateData) {
    const store = await StoreModel.findById(id);
    if (!store) {
      throw { status: 404, message: 'Store not found' };
    }

    if (updateData.name !== undefined && updateData.name.trim() === '') {
      throw { status: 400, message: 'Store name cannot be empty' };
    }

    // Validate timezone if provided
    if (updateData.timezone) {
      const tzRegex = /^[A-Za-z/_]+$/;
      if (!tzRegex.test(updateData.timezone)) {
        throw { status: 400, message: 'Invalid timezone format' };
      }
    }

    await StoreModel.update(id, updateData);
    return await StoreModel.findById(id);
  }

 
  static async deleteStore(id) {
    const store = await StoreModel.findById(id);
    if (!store) {
      throw { status: 404, message: 'Store not found' };
    }

    await StoreModel.delete(id);
    return { message: 'Store deleted successfully' };
  }
}

module.exports = StoreService;
