const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { getRoles, getAll, getById, create, update, deleteUser, updatePin, removePin } = require('../controllers/user.controller');

// GET /api/users/roles - Get all roles (all authenticated roles)
router.get('/roles', authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), getRoles);

// GET /api/users - Get all users (superuser sees all, others see only their store users)
router.get('/', authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), getAll);

// Write operations - superuser only
router.get('/:id', authenticate, authorize(['superuser']), getById);
router.post('/', authenticate, authorize(['superuser']), create);
router.put('/:id', authenticate, authorize(['superuser']), update);
router.delete('/:id', authenticate, authorize(['superuser']), deleteUser);

// PIN management - captain and superuser
router.put('/:id/pin', authenticate, authorize(['superuser', 'captain']), updatePin);
router.delete('/:id/pin', authenticate, authorize(['superuser']), removePin);

module.exports = router;
