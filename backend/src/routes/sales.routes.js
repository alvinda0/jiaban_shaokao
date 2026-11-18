const express = require('express');
const router = express.Router({ mergeParams: true });
const SalesController = require('../controllers/sales.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/stores/:store_id/sales/report
 * Get comprehensive sales report
 * Query params:
 *   - date_from (required): Start date (YYYY-MM-DD)
 *   - date_to (required): End date (YYYY-MM-DD)
 *   - time_from (optional): Start time (HH:MM:SS)
 *   - time_to (optional): End time (HH:MM:SS)
 */
router.get('/report', SalesController.getSalesReport);

/**
 * GET /api/stores/:store_id/sales/payment-methods
 * Get sales breakdown by payment method
 */
router.get('/payment-methods', SalesController.getSalesByPaymentMethod);

/**
 * GET /api/stores/:store_id/sales/top-products
 * Get top selling products
 * Query params:
 *   - limit (optional): Number of products to return (default: 20)
 */
router.get('/top-products', SalesController.getTopProducts);

/**
 * GET /api/stores/:store_id/sales/by-category
 * Get sales summary by category
 */
router.get('/by-category', SalesController.getSalesByCategory);

/**
 * GET /api/stores/:store_id/sales/discounts
 * Get discount breakdown
 */
router.get('/discounts', SalesController.getDiscountBreakdown);

module.exports = router;
