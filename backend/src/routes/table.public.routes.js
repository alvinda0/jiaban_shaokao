const express = require('express');
const router = express.Router();
const { getPublicTables } = require('../controllers/table.controller');

// Public route to get tables by store_id (for QR code customer order)
router.get('/', getPublicTables);

module.exports = router;
