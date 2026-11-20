const express = require('express');
const { getDashboardData } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Get dashboard data for a store
router.get('/stores/:store_id/dashboard', authenticate, getDashboardData);

module.exports = router;
