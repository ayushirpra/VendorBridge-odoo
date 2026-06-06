const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validationMiddleware');
const {
  rfqIdParam,
  createRfqValidation,
  updateRfqValidation,
  listRfqsValidation,
} = require('../validators/rfqValidators');

const router = express.Router();

// ── All RFQ routes require a valid JWT ────────────────────────────────────────
router.use(authMiddleware);

// ─── Helper: fire-and-forget activity log ────────────────────────────────────
function logActivity(userId, action, entityId, description) {
  pool
    .query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'RFQ', $3, $4)`,
      [userId, action, entityId, description]
    )
    .catch((err) => console.error('Activity log error:', err));
}

// ─── Helper: resolve vendor_id for the logged-in vendor user ─────────────────
// Vendors in the users table are linked to the vendors table via contact_email
async function getVendorIdForUser(userId) {
  const result = await pool.query(
    `SELECT v.id
       FROM vendors v
       JOIN users u ON u.email = v.contact_email
      WHERE u.id = $1
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rfqs
// Create a new RFQ — procurement_officer / admin only
// Wraps rfqs + rfq_line_items + rfq_vendors inserts in a single transaction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs:
 *   post:
 *     summary: Create a new RFQ
 *     tags: [RFQs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - deadline
 *               - line_items
 *               - vendor_ids
 *             properties:
 *               title:
 *                 type: string
 *                 example: Office Furniture for Q3
 *               category:
 *                 type: string
 *                 example: Office Supplies
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-01T17:00:00
 *               description:
 *                 type: string
 *                 example: Procurement of ergonomic furniture for 30 employees
 *               line_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [item_name, qty, unit]
 *                   properties:
 *                     item_name:
 *                       type: string
 *                       example: Office Chair
 *                     qty:
 *                       type: number
 *                       example: 30
 *                     unit:
 *                       type: string
 *                       example: pieces
 *               vendor_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *     responses:
 *       201:
 *         description: RFQ created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  roleMiddleware(['admin', 'procurement_officer']),
  createRfqValidation,
  validateRequest,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        title,
        category    = null,
        deadline,
        description = null,
        line_items,
        vendor_ids,
      } = req.body;

      await client.query('BEGIN');

      // 1. Validate all vendor_ids exist and are active
      const vendorCheck = await client.query(
        `SELECT id FROM vendors WHERE id = ANY($1::int[]) AND status = 'active'`,
        [vendor_ids]
      );
      if (vendorCheck.rows.length !== vendor_ids.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'One or more vendor_ids are invalid or not active',
        });
      }

      // 2. Insert the RFQ (status defaults to 'draft')
      const rfqResult = await client.query(
        `INSERT INTO rfqs (title, category, deadline, description, status, created_by)
         VALUES ($1, $2, $3, $4, 'draft', $5)
         RETURNING *`,
        [title, category, deadline, description, req.user.userId]
      );
      const rfq = rfqResult.rows[0];

      // 3. Insert line items
      for (const item of line_items) {
        await client.query(
          `INSERT INTO rfq_line_items (rfq_id, item_name, quantity, unit)
           VALUES ($1, $2, $3, $4)`,
          [rfq.id, item.item_name.trim(), item.qty, item.unit.trim()]
        );
      }

      // 4. Insert rfq_vendors (many-to-many)
      for (const vendorId of vendor_ids) {
        await client.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`,
          [rfq.id, vendorId]
        );
      }

      await client.query('COMMIT');

      // 5. Log activity (non-blocking, outside transaction)
      logActivity(
        req.user.userId,
        'CREATE',
        rfq.id,
        `Created RFQ: ${rfq.title}`
      );

      // 6. Return the full RFQ with its related data
      const fullRfq = await getFullRfq(rfq.id);

      return res.status(201).json({
        success: true,
        message: 'RFQ created successfully',
        rfq: fullRfq,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('POST /api/rfqs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create RFQ',
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rfqs/:id/publish
// Publish an RFQ — changes status draft → published
// Logs activity as "notification" for each assigned vendor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs/{id}/publish:
 *   post:
 *     summary: Publish an RFQ and notify assigned vendors
 *     tags: [RFQs]
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
 *         description: RFQ published
 *       400:
 *         description: RFQ is not in draft status
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: RFQ not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/publish',
  roleMiddleware(['admin', 'procurement_officer']),
  rfqIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Load RFQ
      const rfqCheck = await pool.query(
        'SELECT id, title, status FROM rfqs WHERE id = $1',
        [id]
      );

      if (rfqCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }

      const rfq = rfqCheck.rows[0];

      if (rfq.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: `RFQ cannot be published. Current status is '${rfq.status}'. Only draft RFQs can be published.`,
        });
      }

      // Update status to published
      await pool.query(
        `UPDATE rfqs SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      // Log publish action
      logActivity(
        req.user.userId,
        'PUBLISH',
        id,
        `Published RFQ: ${rfq.title}`
      );

      // Notify each assigned vendor — log an activity entry per vendor
      const assignedVendors = await pool.query(
        `SELECT rv.vendor_id, v.company_name
           FROM rfq_vendors rv
           JOIN vendors v ON v.id = rv.vendor_id
          WHERE rv.rfq_id = $1`,
        [id]
      );

      for (const vendor of assignedVendors.rows) {
        logActivity(
          req.user.userId,
          'NOTIFY_VENDOR',
          id,
          `Notified vendor: ${vendor.company_name} (ID: ${vendor.vendor_id}) about RFQ #${id}: ${rfq.title}`
        );
      }

      const fullRfq = await getFullRfq(id);

      return res.json({
        success: true,
        message: `RFQ published successfully. ${assignedVendors.rows.length} vendor(s) notified.`,
        rfq: fullRfq,
      });
    } catch (error) {
      console.error('POST /api/rfqs/:id/publish error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to publish RFQ',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rfqs
// List RFQs:
//   - procurement_officer / admin → all RFQs
//   - vendor                     → only RFQs where their vendor_id is in rfq_vendors
// Supports ?status= filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs:
 *   get:
 *     summary: List RFQs (role-filtered)
 *     tags: [RFQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed]
 *         description: Filter by RFQ status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of RFQs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  listRfqsValidation,
  validateRequest,
  async (req, res) => {
    try {
      const {
        status,
        limit  = 20,
        offset = 0,
      } = req.query;

      const params  = [];
      const filters = ['1=1'];

      // Status filter
      if (status) {
        params.push(status);
        filters.push(`r.status = $${params.length}`);
      }

      // Vendor-scoped filter
      if (req.user.role === 'vendor') {
        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) {
          return res.json({ success: true, total: 0, rfqs: [] });
        }
        params.push(vendorId);
        filters.push(
          `EXISTS (
             SELECT 1 FROM rfq_vendors rv
             WHERE rv.rfq_id = r.id AND rv.vendor_id = $${params.length}
           )`
        );
      }

      const whereClause = filters.join(' AND ');

      // Count query
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM rfqs r WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      // Data query with pagination
      const pageLimit  = Math.min(parseInt(limit,  10) || 20, 100);
      const pageOffset = Math.max(parseInt(offset, 10) || 0,  0);

      params.push(pageLimit);
      const limitIdx = params.length;
      params.push(pageOffset);
      const offsetIdx = params.length;

      const dataResult = await pool.query(
        `SELECT
             r.id,
             r.title,
             r.category,
             r.deadline,
             r.description,
             r.status,
             r.created_at,
             r.updated_at,
             u.first_name || ' ' || u.last_name AS created_by_name,
             -- line item count
             (SELECT COUNT(*) FROM rfq_line_items li WHERE li.rfq_id = r.id) AS line_items_count,
             -- assigned vendor count
             (SELECT COUNT(*) FROM rfq_vendors rv WHERE rv.rfq_id = r.id) AS vendor_count,
             -- submitted quotation count
             (SELECT COUNT(*) FROM quotations q WHERE q.rfq_id = r.id) AS quotations_count
           FROM rfqs r
           JOIN users u ON u.id = r.created_by
          WHERE ${whereClause}
          ORDER BY r.created_at DESC
          LIMIT  $${limitIdx}
          OFFSET $${offsetIdx}`,
        params
      );

      return res.json({
        success: true,
        total,
        limit:  pageLimit,
        offset: pageOffset,
        count:  dataResult.rows.length,
        rfqs:   dataResult.rows,
      });
    } catch (error) {
      console.error('GET /api/rfqs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch RFQs',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rfqs/:id
// Full RFQ detail with line items and assigned vendors
// Vendors can only view RFQs they're assigned to
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs/{id}:
 *   get:
 *     summary: Get full RFQ detail
 *     tags: [RFQs]
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
 *         description: RFQ detail with line items and vendors
 *       403:
 *         description: Vendor not assigned to this RFQ
 *       404:
 *         description: RFQ not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  rfqIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      // For vendors, confirm they are assigned to this RFQ
      if (req.user.role === 'vendor') {
        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) {
          return res.status(403).json({ success: false, message: 'Vendor profile not found for this user' });
        }
        const assignCheck = await pool.query(
          'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
          [id, vendorId]
        );
        if (assignCheck.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this RFQ.' });
        }
      }

      const rfq = await getFullRfq(id);

      if (!rfq) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }

      return res.json({ success: true, rfq });
    } catch (error) {
      console.error('GET /api/rfqs/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch RFQ',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/rfqs/:id
// Update an RFQ — only allowed when status is 'draft'
// Replaces line_items and vendor_ids if provided (full replace strategy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs/{id}:
 *   put:
 *     summary: Update an RFQ (draft only)
 *     tags: [RFQs]
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
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               line_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_name:
 *                       type: string
 *                     qty:
 *                       type: number
 *                     unit:
 *                       type: string
 *               vendor_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: RFQ updated
 *       400:
 *         description: Validation error or RFQ is not in draft status
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: RFQ not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  roleMiddleware(['admin', 'procurement_officer']),
  rfqIdParam,
  updateRfqValidation,
  validateRequest,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      // Load current RFQ
      const current = await client.query(
        'SELECT * FROM rfqs WHERE id = $1',
        [id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }

      const prev = current.rows[0];

      if (prev.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: `RFQ cannot be edited. Current status is '${prev.status}'. Only draft RFQs can be updated.`,
        });
      }

      const {
        title       = prev.title,
        category    = prev.category,
        deadline    = prev.deadline,
        description = prev.description,
        line_items,
        vendor_ids,
      } = req.body;

      await client.query('BEGIN');

      // Update core RFQ fields
      const rfqResult = await client.query(
        `UPDATE rfqs
            SET title       = $1,
                category    = $2,
                deadline    = $3,
                description = $4,
                updated_at  = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *`,
        [title, category, deadline, description, id]
      );

      // Replace line items if provided
      if (line_items && line_items.length > 0) {
        await client.query('DELETE FROM rfq_line_items WHERE rfq_id = $1', [id]);
        for (const item of line_items) {
          await client.query(
            `INSERT INTO rfq_line_items (rfq_id, item_name, quantity, unit)
             VALUES ($1, $2, $3, $4)`,
            [id, item.item_name.trim(), item.qty, item.unit.trim()]
          );
        }
      }

      // Replace vendor assignments if provided
      if (vendor_ids && vendor_ids.length > 0) {
        // Validate vendors exist and are active
        const vendorCheck = await client.query(
          `SELECT id FROM vendors WHERE id = ANY($1::int[]) AND status = 'active'`,
          [vendor_ids]
        );
        if (vendorCheck.rows.length !== vendor_ids.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'One or more vendor_ids are invalid or not active',
          });
        }

        await client.query('DELETE FROM rfq_vendors WHERE rfq_id = $1', [id]);
        for (const vendorId of vendor_ids) {
          await client.query(
            `INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`,
            [id, vendorId]
          );
        }
      }

      await client.query('COMMIT');

      logActivity(
        req.user.userId,
        'UPDATE',
        id,
        `Updated RFQ: ${rfqResult.rows[0].title}`
      );

      const fullRfq = await getFullRfq(id);

      return res.json({
        success: true,
        message: 'RFQ updated successfully',
        rfq: fullRfq,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('PUT /api/rfqs/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update RFQ',
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rfqs/:id/quotations
// All quotations submitted for a given RFQ
// Vendors can only see their own quotation; officers/admin see all
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/rfqs/{id}/quotations:
 *   get:
 *     summary: Get all quotations for an RFQ
 *     tags: [RFQs]
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
 *         description: List of quotations with their line items
 *       403:
 *         description: Access denied
 *       404:
 *         description: RFQ not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id/quotations',
  rfqIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Confirm RFQ exists
      const rfqCheck = await pool.query(
        'SELECT id, title, status FROM rfqs WHERE id = $1',
        [id]
      );
      if (rfqCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }

      const params  = [id];
      const filters = ['q.rfq_id = $1'];

      // Vendor can only see their own quotation
      if (req.user.role === 'vendor') {
        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) {
          return res.json({ success: true, quotations: [] });
        }
        // Also verify they're assigned to this RFQ
        const assignCheck = await pool.query(
          'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
          [id, vendorId]
        );
        if (assignCheck.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this RFQ.' });
        }
        params.push(vendorId);
        filters.push(`q.vendor_id = $${params.length}`);
      }

      const whereClause = filters.join(' AND ');

      // Fetch quotations with vendor info
      const quotationsResult = await pool.query(
        `SELECT
             q.id,
             q.rfq_id,
             q.vendor_id,
             v.company_name AS vendor_name,
             q.tax_percent,
             q.notes,
             q.status,
             q.submitted_at,
             q.created_at,
             q.updated_at
           FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id
          WHERE ${whereClause}
          ORDER BY q.submitted_at DESC NULLS LAST, q.created_at DESC`,
        params
      );

      // Attach line items to each quotation
      const quotations = await Promise.all(
        quotationsResult.rows.map(async (quotation) => {
          const lineItems = await pool.query(
            `SELECT id, item_name, quantity, unit_price, total, delivery_days
               FROM quotation_line_items
              WHERE quotation_id = $1
              ORDER BY id`,
            [quotation.id]
          );
          return { ...quotation, line_items: lineItems.rows };
        })
      );

      return res.json({
        success: true,
        rfq_id: parseInt(id, 10),
        rfq_title: rfqCheck.rows[0].title,
        count: quotations.length,
        quotations,
      });
    } catch (error) {
      console.error('GET /api/rfqs/:id/quotations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotations',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: fetch a full RFQ by id (header + line items + vendors)
// ─────────────────────────────────────────────────────────────────────────────
async function getFullRfq(rfqId) {
  const rfqResult = await pool.query(
    `SELECT
         r.id,
         r.title,
         r.category,
         r.deadline,
         r.description,
         r.status,
         r.created_at,
         r.updated_at,
         u.id           AS created_by_id,
         u.first_name || ' ' || u.last_name AS created_by_name,
         u.email        AS created_by_email
       FROM rfqs r
       JOIN users u ON u.id = r.created_by
      WHERE r.id = $1`,
    [rfqId]
  );

  if (rfqResult.rows.length === 0) return null;

  const rfq = rfqResult.rows[0];

  // Line items
  const lineItemsResult = await pool.query(
    `SELECT id, item_name, quantity, unit, created_at
       FROM rfq_line_items
      WHERE rfq_id = $1
      ORDER BY id`,
    [rfqId]
  );

  // Assigned vendors
  const vendorsResult = await pool.query(
    `SELECT
         rv.id AS assignment_id,
         v.id  AS vendor_id,
         v.company_name,
         v.category,
         v.contact_name,
         v.contact_email,
         v.status AS vendor_status,
         rv.assigned_at
       FROM rfq_vendors rv
       JOIN vendors v ON v.id = rv.vendor_id
      WHERE rv.rfq_id = $1
      ORDER BY rv.assigned_at`,
    [rfqId]
  );

  return {
    ...rfq,
    line_items:      lineItemsResult.rows,
    assigned_vendors: vendorsResult.rows,
  };
}

module.exports = router;
