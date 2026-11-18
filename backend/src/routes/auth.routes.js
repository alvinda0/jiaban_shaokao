const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/register', authenticate, authorize('superuser'), register);

module.exports = router;
