const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

router.get('/', orderController.getAllOrders);
router.get('/statistics/today', orderController.getTodayStatistics);
router.get('/:id', orderController.getOrderById);
router.get('/:id/details', orderController.getFullOrderDetails);
router.post('/', orderController.createOrder);
router.post('/:id/items', orderController.addOrderItem);
router.put('/:id/items/:item_id', orderController.updateOrderItem);
router.delete('/:id/items/:item_id', orderController.deleteOrderItem);
router.get('/:id/bills', orderController.getOrderBills);

module.exports = router;
