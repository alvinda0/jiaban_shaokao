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
    const { name, address, phone, logo_url } = storeData;

    if (!name || name.trim() === '') {
      throw { status: 400, message: 'Store name is required' };
    }

    const result = await StoreModel.create({ name, address, phone, logo_url });
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
