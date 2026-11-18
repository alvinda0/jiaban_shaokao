const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, deleteVoucher, validate } = require('../controllers/voucher.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public route - Validate voucher
router.post('/validate', validate);

// Protected routes - superuser, admin, captain, and kitchen
router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']));

router.get('/',       getAll);
router.get('/:id',    getById);
router.post('/',      create);
router.put('/:id',    update);
router.delete('/:id', deleteVoucher);

module.exports = router;
