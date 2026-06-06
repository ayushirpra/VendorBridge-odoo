const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validationMiddleware');
const {
  listVendorsValidation,
  createVendorValidation,
  updateVendorValidation,
  patchStatusValidation,
  vendorIdParam,
} = require('../validators/vendorValidators');

const router = express.Router();

// ── All vendor routes require a valid JWT ─────────────────────────────────────
router.use(authMiddleware);

// ─── Shared role guard for write operations ───────────────────────────────────
const writeAccess = roleMiddleware(['admin', 'procurement_officer']);

// ─── Helper: fire-and-forget activity log (non-blocking) ─────────────────────
function logActivity(userId, action, entityId, description) {
  pool
    .query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'VENDOR', $3, $4)`,
      [userId, action, entityId, description]
    )
    .catch((err) => console.error('Activity log error:', err));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vendors
// List all vendors with optional filters + full-text search + pagination
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: List vendors with filters, search and pagination
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, blocked]
 *         description: Filter by vendor status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Exact-match filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across company_name, gst_number and category (case-insensitive)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Page size (1–100, default 20)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Paginated list of vendors
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  listVendorsValidation,
  validateRequest,
  async (req, res) => {
    try {
      const {
        status,
        category,
        search,
        limit  = 20,
        offset = 0,
      } = req.query;

      const params  = [];
      const filters = ['1=1'];

      // ── Status filter ──
      if (status) {
        params.push(status);
        filters.push(`v.status = $${params.length}`);
      }

      // ── Category exact-match filter ──
      if (category) {
        params.push(category);
        filters.push(`v.category ILIKE $${params.length}`);
      }

      // ── Full-text search across company_name, gst_number, category ──
      if (search) {
        const term = `%${search}%`;
        params.push(term);
        filters.push(
          `(v.company_name ILIKE $${params.length}
            OR v.gst_number  ILIKE $${params.length}
            OR v.category    ILIKE $${params.length}
            OR v.contact_name ILIKE $${params.length})`
        );
      }

      const whereClause = filters.join(' AND ');

      // ── Count query (for pagination metadata) ──
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
           FROM vendors v
          WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // ── Data query ──
      const pageLimit  = Math.min(parseInt(limit,  10) || 20, 100);
      const pageOffset = Math.max(parseInt(offset, 10) || 0,  0);

      params.push(pageLimit);
      const limitIdx = params.length;
      params.push(pageOffset);
      const offsetIdx = params.length;

      const dataResult = await pool.query(
        `SELECT
             v.id,
             v.company_name,
             v.category,
             v.gst_number,
             v.contact_name,
             v.contact_email,
             v.contact_phone,
             v.address,
             v.status,
             v.created_at,
             v.updated_at,
             u.first_name || ' ' || u.last_name AS created_by_name
           FROM vendors v
           LEFT JOIN users u ON u.id = v.created_by
          WHERE ${whereClause}
          ORDER BY v.created_at DESC
          LIMIT  $${limitIdx}
          OFFSET $${offsetIdx}`,
        params
      );

      return res.json({
        success: true,
        total,
        limit:   pageLimit,
        offset:  pageOffset,
        count:   dataResult.rows.length,
        vendors: dataResult.rows,
      });
    } catch (error) {
      console.error('GET /api/vendors error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vendors',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vendors/:id
// Vendor detail — includes creator info + active RFQ count
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get vendor detail
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor detail
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  vendorIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
             v.*,
             u.first_name || ' ' || u.last_name AS created_by_name,
             u.email                             AS created_by_email,
             -- active RFQs this vendor is assigned to
             (SELECT COUNT(*)
                FROM rfq_vendors rv
                JOIN rfqs r ON r.id = rv.rfq_id
               WHERE rv.vendor_id = v.id
                 AND r.status = 'published') AS active_rfq_count,
             -- total POs raised for this vendor
             (SELECT COUNT(*)
                FROM purchase_orders po
               WHERE po.vendor_id = v.id) AS total_po_count,
             -- total spend
             (SELECT COALESCE(SUM(grand_total), 0)
                FROM purchase_orders po
               WHERE po.vendor_id = v.id) AS total_spend
           FROM vendors v
           LEFT JOIN users u ON u.id = v.created_by
          WHERE v.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      return res.json({
        success: true,
        vendor: result.rows[0],
      });
    } catch (error) {
      console.error('GET /api/vendors/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vendors
// Create a new vendor — admin / procurement_officer only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *               - contact_name
 *               - contact_email
 *             properties:
 *               company_name:
 *                 type: string
 *                 example: TechSupplies Inc
 *               category:
 *                 type: string
 *                 example: Electronics
 *               gst_number:
 *                 type: string
 *                 example: 29ABCDE1234F1Z5
 *               contact_name:
 *                 type: string
 *                 example: Robert Smith
 *               contact_email:
 *                 type: string
 *                 format: email
 *                 example: robert@techsupplies.com
 *               contact_phone:
 *                 type: string
 *                 example: +1-555-1001
 *               address:
 *                 type: string
 *                 example: 123 Tech Street, CA 94025
 *               status:
 *                 type: string
 *                 enum: [active, pending, blocked]
 *                 default: pending
 *     responses:
 *       201:
 *         description: Vendor created
 *       400:
 *         description: Validation error or duplicate GST / email
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  writeAccess,
  createVendorValidation,
  validateRequest,
  async (req, res) => {
    try {
      const {
        company_name,
        category     = null,
        gst_number   = null,
        contact_name,
        contact_email,
        contact_phone = null,
        address       = null,
        status        = 'pending',
      } = req.body;

      const result = await pool.query(
        `INSERT INTO vendors
           (company_name, category, gst_number, contact_name,
            contact_email, contact_phone, address, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          company_name,
          category,
          gst_number   ? gst_number.toUpperCase() : null,
          contact_name,
          contact_email,
          contact_phone,
          address,
          status,
          req.user.userId,
        ]
      );

      const vendor = result.rows[0];

      logActivity(
        req.user.userId,
        'CREATE',
        vendor.id,
        `Created vendor: ${vendor.company_name}`
      );

      return res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        vendor,
      });
    } catch (error) {
      console.error('POST /api/vendors error:', error);

      // PostgreSQL unique-constraint violation
      if (error.code === '23505') {
        const detail = error.detail || '';
        const field  = detail.includes('gst_number')
          ? 'gst_number'
          : detail.includes('contact_email')
          ? 'contact_email'
          : 'field';
        return res.status(400).json({
          success: false,
          message: `A vendor with this ${field} already exists`,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create vendor',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vendors/:id
// Full update of vendor details — admin / procurement_officer only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: Update vendor details
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name:
 *                 type: string
 *               category:
 *                 type: string
 *               gst_number:
 *                 type: string
 *               contact_name:
 *                 type: string
 *               contact_email:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated
 *       400:
 *         description: Validation error or duplicate GST / email
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  writeAccess,
  vendorIdParam,
  updateVendorValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Load current vendor first so we can do a partial merge
      const current = await pool.query(
        'SELECT * FROM vendors WHERE id = $1',
        [id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      const prev = current.rows[0];

      // Merge incoming fields over existing values (undefined = keep old)
      const {
        company_name  = prev.company_name,
        category      = prev.category,
        gst_number,
        contact_name  = prev.contact_name,
        contact_email = prev.contact_email,
        contact_phone = prev.contact_phone,
        address       = prev.address,
      } = req.body;

      // Resolve GST: explicit null clears it, undefined keeps old
      const resolvedGst =
        gst_number === null
          ? null
          : gst_number !== undefined
          ? gst_number.toUpperCase()
          : prev.gst_number;

      const result = await pool.query(
        `UPDATE vendors
            SET company_name  = $1,
                category      = $2,
                gst_number    = $3,
                contact_name  = $4,
                contact_email = $5,
                contact_phone = $6,
                address       = $7,
                updated_at    = CURRENT_TIMESTAMP
          WHERE id = $8
          RETURNING *`,
        [
          company_name,
          category,
          resolvedGst,
          contact_name,
          contact_email,
          contact_phone,
          address,
          id,
        ]
      );

      const vendor = result.rows[0];

      logActivity(
        req.user.userId,
        'UPDATE',
        vendor.id,
        `Updated vendor: ${vendor.company_name}`
      );

      return res.json({
        success: true,
        message: 'Vendor updated successfully',
        vendor,
      });
    } catch (error) {
      console.error('PUT /api/vendors/:id error:', error);

      if (error.code === '23505') {
        const detail = error.detail || '';
        const field  = detail.includes('gst_number') ? 'gst_number' : 'contact_email';
        return res.status(400).json({
          success: false,
          message: `A vendor with this ${field} already exists`,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update vendor',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vendors/:id/status
// Change vendor status only — admin / procurement_officer only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors/{id}/status:
 *   patch:
 *     summary: Change vendor status
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, pending, blocked]
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change (recommended when blocking)
 *                 example: Repeated delivery delays
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Validation error or status unchanged
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.patch(
  '/:id/status',
  writeAccess,
  vendorIdParam,
  patchStatusValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { id }     = req.params;
      const { status, reason } = req.body;

      // Fetch current record
      const current = await pool.query(
        'SELECT id, company_name, status FROM vendors WHERE id = $1',
        [id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      const prev = current.rows[0];

      if (prev.status === status) {
        return res.status(400).json({
          success: false,
          message: `Vendor status is already '${status}'`,
        });
      }

      const result = await pool.query(
        `UPDATE vendors
            SET status     = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, company_name, status, updated_at`,
        [status, id]
      );

      const vendor = result.rows[0];

      // Build a descriptive log message
      let description = `Changed vendor status: ${prev.company_name} — ${prev.status} → ${status}`;
      if (reason) description += ` | Reason: ${reason}`;

      // Use action that reflects the new status for clearer audit trail
      const actionMap = { active: 'ACTIVATE', pending: 'SET_PENDING', blocked: 'BLOCK' };
      logActivity(req.user.userId, actionMap[status] || 'STATUS_CHANGE', vendor.id, description);

      return res.json({
        success: true,
        message: `Vendor status updated to '${status}'`,
        vendor,
        previous_status: prev.status,
      });
    } catch (error) {
      console.error('PATCH /api/vendors/:id/status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update vendor status',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vendors/:id/activity
// Last N activity log entries for a specific vendor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors/{id}/activity:
 *   get:
 *     summary: Get recent activity logs for a vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 3
 *     responses:
 *       200:
 *         description: Activity log entries
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id/activity',
  vendorIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const limit  = Math.min(parseInt(req.query.limit, 10) || 3, 20);

      // Confirm vendor exists first
      const check = await pool.query('SELECT id FROM vendors WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Vendor not found' });
      }

      const result = await pool.query(
        `SELECT
             al.id,
             al.action,
             al.entity_type,
             al.description,
             al.created_at,
             u.first_name,
             u.last_name
           FROM activity_logs al
           LEFT JOIN users u ON u.id = al.user_id
          WHERE al.entity_type = 'VENDOR'
            AND al.entity_id   = $1
          ORDER BY al.created_at DESC
          LIMIT $2`,
        [id, limit]
      );

      return res.json({ success: true, activity: result.rows });
    } catch (error) {
      console.error('GET /api/vendors/:id/activity error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor activity',
        error:   error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/vendors/:id  (admin only — kept from original)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Delete vendor (Admin only)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vendor deleted
 *       403:
 *         description: Admin only
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  roleMiddleware(['admin']),
  vendorIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM vendors WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      const vendor = result.rows[0];

      logActivity(
        req.user.userId,
        'DELETE',
        vendor.id,
        `Deleted vendor: ${vendor.company_name}`
      );

      return res.json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      console.error('DELETE /api/vendors/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete vendor',
        error:   error.message,
      });
    }
  }
);

module.exports = router;
