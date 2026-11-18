const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/product.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');
const { uploadProductImage } = require('../middlewares/upload.middleware');


router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), checkStoreAccess);
router.post('/upload-image', uploadProductImage, productController.uploadImage);
router.get('/low-stock', productController.getLowStock);
router.get('/', productController.getByStore);
router.get('/:id', productController.getById);
router.get('/:id/stock-history', productController.getStockHistory);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.post('/:id/adjust-stock', productController.adjustStock);
router.delete('/:id', productController.remove);

module.exports = router;
