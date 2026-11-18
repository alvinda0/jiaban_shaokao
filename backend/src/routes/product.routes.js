const express = require('express');
const router = express.Router();
const { getPublicMenu } = require('../controllers/product.controller');

router.get('/', getPublicMenu);

module.exports = router;
