const jwt = require('jsonwebtoken');

// Verifikasi JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔑 Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Cek role global (dari tabel users)
// contoh: authorize(['superuser', 'admin', 'captain'])
const authorize = (...allowedRoles) => {
  // Flatten array jika dipanggil dengan spread operator atau array
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
  
  const middlewareId = Math.random().toString(36).substring(7);
  console.log(`⚙️ Authorize middleware created with roles:`, roles, `ID: ${middlewareId}`);
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    console.log(`🔐 Authorize check (ID: ${middlewareId}):`, { 
      userRole: req.user.role, 
      allowedRoles: roles,
      rolesCount: roles.length,
      match: roles.includes(req.user.role)
    });
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: insufficient role. Your role: ${req.user.role}, Required: ${roles.join(' or ')}` 
      });
    }
    next();
  };
};

// Check if user has access to specific store
// Superuser can access all stores, admin/captain/kitchen can only access their own store
const checkStoreAccess = (req, res, next) => {
  const { role, store_id: userStoreId } = req.user;
  // Handle both :id and :storeId parameter names
  const requestedStoreId = req.params.storeId || req.params.id || req.body.store_id;

  console.log('🏪 Store access check:', {
    userRole: role,
    userStoreId,
    requestedStoreId,
    isSuperuser: role === 'superuser'
  });

  // Superuser can access all stores
  if (role === 'superuser') {
    return next();
  }

  // Non-superuser must have a store_id
  if (!userStoreId) {
    return res.status(403).json({
      success: false,
      message: 'Your account is not assigned to any store'
    });
  }

  // Non-superuser can only access their own store
  if (requestedStoreId && requestedStoreId !== userStoreId) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own store'
    });
  }

  next();
};

module.exports = { authenticate, authorize, checkStoreAccess };
