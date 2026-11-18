const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, deleteStore, uploadLogo } = require('../controllers/store.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');
const { uploadLogo: uploadLogoMiddleware } = require('../middlewares/upload.middleware');

router.get('/public/:id', getById);
router.get('/', authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), getAll);
router.get('/:id', authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), checkStoreAccess, getById);
router.post('/', authenticate, authorize(['superuser']), create);
router.put('/:id', authenticate, authorize(['superuser']), update);
router.delete('/:id', authenticate, authorize(['superuser']), deleteStore);
router.post('/upload-logo', authenticate, authorize(['superuser']), uploadLogoMiddleware, uploadLogo);

module.exports = router;
