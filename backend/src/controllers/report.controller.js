const ReportModel = require('../models/report.model');

class ReportController {
  static async getProfitLossReport(req, res) {
    try {
      const { storeId } = req.params;
      const { date_from, date_to } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const report = await ReportModel.getProfitLossReport(storeId, { date_from, date_to });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('❌ Report error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get profit/loss report',
        error: error.message,
      });
    }
  }

  static async getDailyRevenue(req, res) {
    try {
      const { storeId } = req.params;
      const { date_from, date_to, time_from, time_to } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await ReportModel.getDailyRevenue(storeId, {
        date_from,
        date_to,
        time_from,
        time_to,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error('❌ getDailyRevenue error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get daily revenue',
        error: error.message,
      });
    }
  }

  static async getTopProducts(req, res) {
    try {
      const { storeId } = req.params;
      const { date_from, date_to, time_from, time_to, limit = 10 } = req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'date_from and date_to are required',
        });
      }

      const data = await ReportModel.getTopProducts(storeId, {
        date_from,
        date_to,
        time_from,
        time_to,
        limit: parseInt(limit),
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error('❌ getTopProducts error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get top products',
        error: error.message,
      });
    }
  }
}

module.exports = ReportController;
