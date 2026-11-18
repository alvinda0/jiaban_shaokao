const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams untuk akses :storeId
const { getByStore, getById, create, update, regenerateQr, remove } = require('../controllers/table.controller');
const { authenticate, authorize, checkStoreAccess } = require('../middlewares/auth.middleware');

router.use(authenticate, authorize(['superuser', 'admin', 'captain', 'kitchen']), checkStoreAccess);

router.get('/',                      getByStore);
router.get('/:id',                   getById);
router.post('/',                     create);
router.put('/:id',                   update);
router.post('/:id/regenerate-qr',    regenerateQr);
router.delete('/:id',                remove);

module.exports = router;
