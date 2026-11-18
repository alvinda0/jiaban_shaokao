const express = require('express');
const router = express.Router({ mergeParams: true });
const ReportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/profit-loss', ReportController.getProfitLossReport);
router.get('/daily-revenue', ReportController.getDailyRevenue);
router.get('/top-products', ReportController.getTopProducts);

module.exports = router;
