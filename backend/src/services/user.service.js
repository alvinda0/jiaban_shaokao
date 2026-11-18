const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');

class UserService {
 
  static async getAllUsers() {
    return await UserModel.findAll();
  }


  static async getUsersByStore(storeId) {
    return await UserModel.findByStoreId(storeId);
  }


  static async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }
    return user;
  }


  static async getUsers(filters = {}) {
    const { store_id } = filters;
    
    if (store_id) {
      return await UserModel.findByStoreId(store_id);
    }
    
    return await UserModel.findAll();
  }


  static async createUser(userData) {
    const { name, email, password, role_id, store_id } = userData;

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw { status: 400, message: 'Email already registered' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role_id,
      store_id: store_id || null
    });

    return await UserModel.findById(result.insertId);
  }


  static async updateUser(id, updateData) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await UserModel.findByEmail(updateData.email);
      if (existingUser) {
        throw { status: 400, message: 'Email already in use' };
      }
    }

    await UserModel.update(id, updateData);
    return await UserModel.findById(id);
  }


  static async deleteUser(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    await UserModel.delete(id);
    return { message: 'User deleted successfully' };
  }


  static async changePassword(id, oldPassword, newPassword) {
    const user = await UserModel.findByEmail(id); // Need full data with password
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw { status: 400, message: 'Current password is incorrect' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(id, hashedPassword);

    return { message: 'Password changed successfully' };
  }
}

module.exports = UserService;
