const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams untuk akses :storeId
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');

// Authenticate, authorize, and check store access
router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), checkStoreAccess);

router.get('/', categoryController.getByStore);
router.get('/parents', categoryController.getParents);
router.get('/:id', categoryController.getById);
router.get('/:id/subcategories', categoryController.getSubcategories);
router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
