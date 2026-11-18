const express = require('express');
const router = express.Router();
const VariantController = require('../controllers/variant.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']));
router.post('/products/:productId/variants', VariantController.createVariantGroup);
router.get('/products/:productId/variants', VariantController.getProductVariants);
router.delete('/products/:productId/variants', VariantController.deleteProductVariants);
router.put('/variants/groups/:groupId', VariantController.updateVariantGroup);
router.delete('/variants/groups/:groupId', VariantController.deleteVariantGroup);
router.post('/variants/groups/:groupId/options', VariantController.createVariantOption);
router.put('/variants/groups/:groupId/options', VariantController.bulkUpdateOptions);
router.put('/variants/options/:optionId', VariantController.updateVariantOption);
router.delete('/variants/options/:optionId', VariantController.deleteVariantOption);

module.exports = router;
