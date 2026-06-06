const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard summary stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats object
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    // Active RFQs (published + not closed)
    const rfqRes = await pool.query(
      `SELECT COUNT(*) AS count FROM rfqs WHERE status = 'published'`
    );

    // Pending approvals
    const approvalRes = await pool.query(
      `SELECT COUNT(*) AS count FROM approvals WHERE status = 'pending'`
    );

    // POs this calendar month
    const poRes = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS total_value
       FROM purchase_orders
       WHERE po_date >= $1`,
      [startOfMonth]
    );

    // Overdue invoices = POs that are approved/pending_payment and past their due_date
    const overdueRes = await pool.query(
      `SELECT COUNT(*) AS count
       FROM purchase_orders
       WHERE status IN ('approved', 'pending_payment')
         AND due_date IS NOT NULL
         AND due_date < CURRENT_DATE`
    );

    res.json({
      success: true,
      stats: {
        activeRfqs:      parseInt(rfqRes.rows[0].count,      10),
        pendingApprovals: parseInt(approvalRes.rows[0].count, 10),
        posThisMonth:    parseInt(poRes.rows[0].count,        10),
        posTotalValue:   parseFloat(poRes.rows[0].total_value),
        overdueInvoices: parseInt(overdueRes.rows[0].count,   10),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/recent-pos:
 *   get:
 *     summary: Get 5 most recent purchase orders
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/recent-pos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         po.id,
         po.po_number,
         v.company_name AS vendor,
         po.grand_total  AS amount,
         po.po_date      AS date,
         po.status
       FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id
       ORDER BY po.created_at DESC
       LIMIT 5`
    );

    res.json({ success: true, pos: result.rows });
  } catch (error) {
    console.error('Recent POs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent POs', error: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/analytics:
 *   get:
 *     summary: Spend by vendor category (for donut chart)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics', async (req, res) => {
  try {
    // Sum grand_total per vendor category from purchase_orders
    const result = await pool.query(
      `SELECT
         COALESCE(v.category, 'Other') AS category,
         SUM(po.grand_total)           AS value
       FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id
       GROUP BY COALESCE(v.category, 'Other')
       ORDER BY value DESC`
    );

    // Assign fixed colours; fall back to a neutral gray for unknowns
    const COLOR_MAP = {
      'Electronics':    '#2563eb',
      'Office Supplies':'#16a34a',
      'Stationery':     '#d97706',
      'Logistics':      '#dc2626',
      'Furniture':      '#16a34a',
      'Manufacturing':  '#7c3aed',
      'Raw Materials':  '#d97706',
      'Energy':         '#0891b2',
    };

    const FALLBACK_COLORS = [
      '#2563eb', '#16a34a', '#d97706', '#dc2626',
      '#7c3aed', '#0891b2', '#db2777', '#ea580c',
    ];

    const analytics = result.rows.map((row, i) => ({
      category: row.category,
      value:    parseFloat(row.value),
      color:    COLOR_MAP[row.category] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     summary: Get last 5 activity log entries
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/activity', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         al.id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.description,
         al.created_at,
         u.first_name,
         u.last_name
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT 5`
    );

    res.json({ success: true, activity: result.rows });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity', error: error.message });
  }
});

module.exports = router;
