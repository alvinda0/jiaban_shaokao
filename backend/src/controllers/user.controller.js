const UserService = require('../services/user.service');
const RoleModel = require('../models/role.model');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/response');

// GET /api/users/roles - Get all roles
const getRoles = async (req, res) => {
  try {
    const { role } = req.user;
    const roles = await RoleModel.findAll();
    
    // Non-superuser tidak bisa melihat role superuser
    const filteredRoles = role === 'superuser' 
      ? roles 
      : roles.filter(r => r.name !== 'superuser');
    
    return success(res, filteredRoles, 'Roles retrieved');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

// GET /api/users - Get all users or users by store
const getAll = async (req, res) => {
  try {
    const { role, store_id } = req.user;
    
    let users;
    if (role === 'superuser') {
      users = await UserService.getAllUsers();
    } else {
      // Non-superuser only sees users from their store
      users = await UserService.getUsersByStore(store_id);
    }
    
    // Remove passwords from all users
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userData } = user;
      return userData;
    });
    
    return success(res, usersWithoutPasswords, 'Users retrieved');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// GET /api/users/:id - Get user by ID
const getById = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    // Don't return password
    const { password, ...userData } = user;
    return success(res, userData, 'User retrieved');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// POST /api/users - Create user
const create = async (req, res) => {
  try {
    const { name, email, password, role_id, store_id, is_active } = req.body;

    if (!name || !email || !password || !role_id) {
      return error(res, 'Name, email, password, and role are required', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role_id,
      store_id: store_id || null,
      is_active: is_active !== undefined ? is_active : 1
    };

    const user = await UserService.createUser(userData);
    return success(res, user, 'User created', 201);
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// PUT /api/users/:id - Update user
const update = async (req, res) => {
  try {
    const { name, email, password, role_id, store_id, is_active } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role_id !== undefined) updateData.role_id = role_id;
    if (store_id !== undefined) updateData.store_id = store_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    // Hash password jika ada
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await UserService.updateUser(req.params.id, updateData);
    return success(res, user, 'User updated');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// DELETE /api/users/:id - Delete user
const deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    return success(res, null, 'User deleted');
  } catch (err) {
    console.error(err);
    return error(res, err.message || 'Internal Server Error', err.status || 500);
  }
};

// PUT /api/users/:id/pin - Update user PIN (only captain and superuser)
const updatePin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.params.id;
    const currentUser = req.user;
    const { pool } = require('../config/db');

    // Check authorization - user can only update their own PIN, or superuser can update anyone
    if (currentUser.id !== userId && currentUser.role !== 'superuser') {
      return error(res, 'Unauthorized. You can only update your own PIN', 403);
    }

    // Check if user has captain or superuser role
    const userResult = await pool.query(
      'SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const userRole = userResult.rows[0].role;
    if (!['captain', 'superuser'].includes(userRole)) {
      return error(res, 'Only Captain and Superuser can have PIN', 403);
    }

    // Validate PIN format (6 digits)
    if (!pin || !/^\d{6}$/.test(pin)) {
      return error(res, 'PIN must be exactly 6 digits', 400);
    }

    // Update PIN in database
    const result = await pool.query(
      'UPDATE users SET pin = $1 WHERE id = $2 RETURNING id, email, pin',
      [pin, userId]
    );

    if (result.rows.length === 0) {
      return error(res, 'Failed to update PIN', 500);
    }

    console.log(`✅ PIN updated for user ${userId}`);
    return success(res, { id: result.rows[0].id, email: result.rows[0].email }, 'PIN updated successfully', 200);
  } catch (err) {
    console.error('Update PIN error:', err);
    return error(res, err.message || 'Failed to update PIN', 500);
  }
};

// DELETE /api/users/:id/pin - Remove user PIN (only superuser)
const removePin = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    const { pool } = require('../config/db');

    // Only superuser can remove PIN
    if (currentUser.role !== 'superuser') {
      return error(res, 'Unauthorized. Only Superuser can remove PIN', 403);
    }

    // Remove PIN from database
    const result = await pool.query(
      'UPDATE users SET pin = NULL WHERE id = $1 RETURNING id, email',
      [userId]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    console.log(`✅ PIN removed for user ${userId}`);
    return success(res, { id: result.rows[0].id, email: result.rows[0].email }, 'PIN removed successfully', 200);
  } catch (err) {
    console.error('Remove PIN error:', err);
    return error(res, err.message || 'Failed to remove PIN', 500);
  }
};

module.exports = { getRoles, getAll, getById, create, update, deleteUser, updatePin, removePin };
