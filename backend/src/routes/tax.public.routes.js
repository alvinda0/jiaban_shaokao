const express = require('express');
const router = express.Router({ mergeParams: true });
const taxController = require('../controllers/tax.controller');

// Public endpoint to get tax rules by store_id
router.get('/', taxController.getByStore);

module.exports = router;