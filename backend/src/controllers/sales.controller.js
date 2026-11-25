const SalesModel = require('../models/sales.model');

class SalesController {
  // Get sales report by date range and time range
  static async getSalesReport(req, res) {
    try {
      const { storeId } = req.params;
      const store_id = storeId;
      const { date_from, date_to, time_from, time_to } = req.query;

      console.log('🔍 getSalesReport called:');
      console.log('   req.params:', req.params);
      console.log('   storeId extracted:', storeId);
      console.log('   store_id assigned:', store_id);
      console.log('   query params:', { date_from, date_to, time_from, time_to });

      // Validate required parameters
      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      // Call model to get sales report
      const report = await SalesModel.getSalesReport(store_id, {
        date_from,
        date_to,
        time_from,
        time_to,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('❌ Error getting sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sales report',
        error: error.message,
      });
    }
  }

  // Get detailed sales by payment method
  static async getSalesByPaymentMethod(req, res) {
    try {
      const { storeId } = req.params;
      const store_id = storeId;
      const { date_from, date_to, time_from, time_to } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await SalesModel.getSalesByPaymentMethod(store_id, {
        date_from,
        date_to,
        time_from,
        time_to,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error getting sales by payment method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sales by payment method',
        error: error.message,
      });
    }
  }

  // Get top selling products
  static async getTopProducts(req, res) {
    try {
      const { storeId } = req.params;
      const store_id = storeId;
      const { date_from, date_to, time_from, time_to, limit = 20 } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await SalesModel.getTopSellingProducts(store_id, {
        date_from,
        date_to,
        time_from,
        time_to,
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error getting top products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get top products',
        error: error.message,
      });
    }
  }

  // Get sales summary by category
  static async getSalesByCategory(req, res) {
    try {
      const { storeId } = req.params;
      const store_id = storeId;
      const { date_from, date_to, time_from, time_to } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await SalesModel.getSalesByCategory(store_id, {
        date_from,
        date_to,
        time_from,
        time_to,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error getting sales by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sales by category',
        error: error.message,
      });
    }
  }

  // Get discount breakdown
  static async getDiscountBreakdown(req, res) {
    try {
      const { storeId } = req.params;
      const store_id = storeId;
      const { date_from, date_to, time_from, time_to } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await SalesModel.getDiscountBreakdown(store_id, {
        date_from,
        date_to,
        time_from,
        time_to,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ Error getting discount breakdown:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get discount breakdown',
        error: error.message,
      });
    }
  }
}

module.exports = SalesController;
