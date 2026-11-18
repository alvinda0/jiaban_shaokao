const express = require('express');
const router = express.Router({ mergeParams: true });
const taxController = require('../controllers/tax.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), checkStoreAccess);
router.get('/', taxController.getByStore);
router.get('/:id', taxController.getById);
router.post('/', taxController.create);
router.put('/:id', taxController.update);
router.delete('/:id', taxController.remove);

module.exports = router;
