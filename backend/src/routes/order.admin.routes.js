const express = require('express');
const router = express.Router({ mergeParams: true });
const orderController = require('../controllers/order.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');


router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'cashier']), checkStoreAccess);
router.get('/', orderController.getAllOrders);
router.get('/statistics/today', orderController.getTodayStatistics);
router.get('/:id', orderController.getOrderById);
router.get('/:id/details', orderController.getFullOrderDetails);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);
router.post('/:id/void', orderController.voidOrder);
router.post('/:id/items', orderController.addOrderItem);
router.put('/:id/items/:item_id', orderController.updateOrderItem);
router.patch('/:id/items/:item_id/status', orderController.updateOrderItemStatus);
router.delete('/:id/items/:item_id', orderController.deleteOrderItem);
router.post('/:id/items/:item_id/void', orderController.voidOrderItem);
router.post(
  '/:id/items/:item_id/complimentary',
  authorize(['superuser', 'admin', 'captain']),
  orderController.setItemComplimentary
);
router.post('/:id/discounts', orderController.applyDiscount);
router.delete('/:id/discounts/:discount_id', orderController.removeDiscount);
router.post('/:id/payments', orderController.addPayment);
router.post(
  '/:id/payments/:payment_id/void',
  authorize(['superuser', 'admin', 'captain']),
  orderController.voidPayment
);
router.post(
  '/:id/complimentary',
  authorize(['superuser', 'admin', 'captain']),
  orderController.setOrderComplimentary
);
router.post(
  '/merge',
  authorize(['superuser', 'admin', 'captain']),
  orderController.mergeOrders
);
router.post(
  '/:id/transfer-table',
  authorize(['superuser', 'admin', 'captain', 'cashier']),
  orderController.transferTable
);
router.post(
  '/:id/split-bill',
  authorize(['superuser', 'admin', 'captain', 'cashier']),
  orderController.splitBill
);
router.post('/:id/split-bills', orderController.createSplitBills);
router.get('/:id/bills', orderController.getOrderBills);
router.post('/:id/accept', orderController.acceptOrder);

module.exports = router;
