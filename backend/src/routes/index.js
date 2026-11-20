const express = require('express');
const router = express.Router();

const authRoutes     = require('./auth.routes');
const userRoutes     = require('./user.routes');
const storeRoutes    = require('./store.routes');
const voucherRoutes  = require('./voucher.routes');
const tableRoutes    = require('./table.routes');
const tablePublicRoutes = require('./table.public.routes');
const categoryRoutes = require('./category.routes');
const taxRoutes      = require('./tax.routes');
const taxPublicRoutes = require('./tax.public.routes');
const productRoutes  = require('./product.routes');
const productAdminRoutes = require('./product.admin.routes');
const variantRoutes  = require('./variant.routes');
const orderRoutes    = require('./order.routes');
const orderAdminRoutes = require('./order.admin.routes');
const pinRoutes      = require('./pin.routes');
const salesRoutes    = require('./sales.routes');
const reportRoutes   = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');

router.use('/auth',                          authRoutes);
router.use('/users',                         userRoutes);
router.use('/stores',                        storeRoutes);
router.use('/vouchers',                      voucherRoutes);
router.use('/stores/:storeId/tables',        tableRoutes);
router.use('/tables',                        tablePublicRoutes);
router.use('/public/stores/:storeId/taxes',  taxPublicRoutes);
router.use('/stores/:storeId/categories',    categoryRoutes);
router.use('/stores/:storeId/taxes',         taxRoutes);
router.use('/stores/:storeId/products',      productAdminRoutes);
router.use('/stores/:storeId/orders',        orderAdminRoutes);
router.use('/stores/:storeId/pin',           pinRoutes);
router.use('/stores/:storeId/sales',         salesRoutes);
router.use('/stores/:storeId/reports',       reportRoutes);
router.use('/',                              dashboardRoutes);
router.use('/products',                      productRoutes);
router.use('/orders',                        orderRoutes);
router.use('/',                              variantRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API v1' });
});

module.exports = router;