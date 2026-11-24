const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const roleModel = require('../models/role.model');
const { success, error } = require('../utils/response');


const register = async (req, res) => {
  try {
    const { name, email, password, role, store_id } = req.body;

    if (!name || !email || !password || !role) {
      return error(res, 'name, email, password, and role are required', 400);
    }

    const allowedRoles = ['admin', 'captain', 'kitchen'];
    if (!allowedRoles.includes(role)) {
      return error(res, `role must be one of: ${allowedRoles.join(', ')}`, 400);
    }

    // Check if email already exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return error(res, 'Email already registered', 409);
    }

    // Get role ID
    const roleData = await roleModel.findByName(role);
    if (!roleData) {
      return error(res, 'Role not found', 404);
    }

    const hashed = await bcrypt.hash(password, 10);
    
    await UserModel.create({
      name,
      email,
      password: hashed,
      role_id: roleData.id,
      store_id: store_id || null
    });

    const newUser = await UserModel.findByEmail(email);
    const { password: _, ...userData } = newUser;

    return success(res, userData, 'User registered successfully', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'email and password are required', 400);
    }

    const user = await UserModel.findByEmail(email);
    console.log('🔍 User found:', user ? `${user.email} (${user.role_name})` : 'NOT FOUND');
    
    if (!user) {
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.is_active) {
      console.log('⚠️ Account inactive');
      return error(res, 'Account is inactive', 403);
    }

    console.log('🔐 Comparing password...');
    const match = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match:', match);
    
    if (!match) {
      return error(res, 'Invalid email or password', 401);
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role_name,
        store_id: user.store_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return success(res, { token }, 'Login successful');
  } catch (err) {
    console.error('❌ Login error:', err);
    return error(res, 'Internal Server Error', 500);
  }
};

const me = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return error(res, 'User not found', 404);
    }

    // Don't return password
    const { password, ...userData } = user;
    
    // Format response with store info
    const response = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role_name,
      role_name: userData.role_name,
      store_id: userData.store_id,
      is_active: userData.is_active,
      created_at: userData.created_at,
      store: userData.store_id ? {
        name: userData.store_name,
        address: userData.address,
        phone: userData.phone,
        is_active: userData.store_is_active,
        logo_url: userData.logo_url
      } : null
    };
    
    return success(res, response, 'Authenticated user');
  } catch (err) {
    console.error(err);
    return error(res, 'Internal Server Error', 500);
  }
};

module.exports = { register, login, me };
