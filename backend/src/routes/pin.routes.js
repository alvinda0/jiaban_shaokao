const express = require('express');
const router = express.Router({ mergeParams: true });
const pinController = require('../controllers/pin.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');

// All PIN routes require authentication and captain/superuser role
router.use(authenticate, authorize(['superuser', 'captain', 'admin']), checkStoreAccess);

// Verify PIN
router.post('/', pinController.verifyPin);

// Cancel full order
router.post('/orders/:id/cancel-full', pinController.cancelFullOrder);

// Cancel single item
router.post('/orders/:id/items/:itemId/cancel', pinController.cancelOrderItem);

// Reduce item quantity
router.post('/orders/:id/items/:itemId/reduce-qty', pinController.reduceItemQty);

module.exports = router;
