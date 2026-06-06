const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validationMiddleware');
const {
  quotationIdParam,
  createQuotationValidation,
  updateQuotationValidation,
  listQuotationsValidation,
} = require('../validators/quotationValidators');

const router = express.Router();

// ── All quotation routes require a valid JWT ──────────────────────────────────
router.use(authMiddleware);

// ─── Helper: fire-and-forget activity log ────────────────────────────────────
function logActivity(userId, action, entityId, description) {
  pool
    .query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'QUOTATION', $3, $4)`,
      [userId, action, entityId, description]
    )
    .catch((err) => console.error('Activity log error:', err));
}

// ─── Helper: resolve vendor_id for the logged-in vendor user ─────────────────
// Vendors in users table are linked to vendors table via contact_email
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

// ─── Helper: fetch a full quotation by id (header + line items) ───────────────
async function getFullQuotation(quotationId) {
  const qResult = await pool.query(
    `SELECT
         q.id,
         q.rfq_id,
         q.vendor_id,
         v.company_name        AS vendor_name,
         r.title               AS rfq_title,
         q.tax_percent,
         q.notes,
         q.status,
         q.submitted_at,
         q.created_at,
         q.updated_at
       FROM quotations q
       JOIN vendors v ON v.id = q.vendor_id
       JOIN rfqs    r ON r.id = q.rfq_id
      WHERE q.id = $1`,
    [quotationId]
  );

  if (qResult.rows.length === 0) return null;

  const quotation = qResult.rows[0];

  const lineItems = await pool.query(
    `SELECT id, item_name, quantity, unit_price, total, delivery_days
       FROM quotation_line_items
      WHERE quotation_id = $1
      ORDER BY id`,
    [quotationId]
  );

  // Calculate financials
  const subtotal   = lineItems.rows.reduce((sum, li) => sum + parseFloat(li.total), 0);
  const taxPercent = parseFloat(quotation.tax_percent) || 0;
  const gstAmount  = parseFloat(((subtotal * taxPercent) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

  return {
    ...quotation,
    line_items:  lineItems.rows,
    subtotal:    parseFloat(subtotal.toFixed(2)),
    gst_amount:  gstAmount,
    grand_total: grandTotal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quotations
// Vendor submits a new quotation for an RFQ they are assigned to
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     summary: Vendor submits a new quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rfq_id
 *               - line_items
 *             properties:
 *               rfq_id:
 *                 type: integer
 *                 example: 1
 *               tax_percent:
 *                 type: number
 *                 example: 18
 *               notes:
 *                 type: string
 *                 example: Delivery included, 2-year warranty
 *               line_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [item_name, qty, unit_price]
 *                   properties:
 *                     item_name:
 *                       type: string
 *                       example: Office Chair
 *                     qty:
 *                       type: number
 *                       example: 50
 *                     unit_price:
 *                       type: number
 *                       example: 250.00
 *                     delivery_days:
 *                       type: integer
 *                       example: 30
 *     responses:
 *       201:
 *         description: Quotation created as draft
 *       400:
 *         description: Validation error or not assigned to RFQ
 *       403:
 *         description: Vendor role required
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  roleMiddleware(['vendor']),
  createQuotationValidation,
  validateRequest,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        rfq_id,
        tax_percent = 0,
        notes       = null,
        line_items,
      } = req.body;

      // Resolve vendor_id from logged-in user
      const vendorId = await getVendorIdForUser(req.user.userId);
      if (!vendorId) {
        return res.status(403).json({
          success: false,
          message: 'No vendor profile linked to your account',
        });
      }

      // Confirm RFQ exists and is published
      const rfqCheck = await pool.query(
        'SELECT id, title, status FROM rfqs WHERE id = $1',
        [rfq_id]
      );
      if (rfqCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }
      if (rfqCheck.rows[0].status !== 'published') {
        return res.status(400).json({
          success: false,
          message: `Cannot quote for an RFQ with status '${rfqCheck.rows[0].status}'. Only published RFQs accept quotations.`,
        });
      }

      // Confirm this vendor is assigned to the RFQ
      const assignCheck = await pool.query(
        'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
        [rfq_id, vendorId]
      );
      if (assignCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this RFQ and cannot submit a quotation',
        });
      }

      // Prevent duplicate quotation for same rfq+vendor
      const dupCheck = await pool.query(
        `SELECT id, status FROM quotations WHERE rfq_id = $1 AND vendor_id = $2`,
        [rfq_id, vendorId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `You already have a quotation (ID: ${dupCheck.rows[0].id}, status: ${dupCheck.rows[0].status}) for this RFQ. Use PUT /api/quotations/${dupCheck.rows[0].id} to edit it.`,
        });
      }

      await client.query('BEGIN');

      // Insert quotation header — status defaults to 'draft'
      const qResult = await client.query(
        `INSERT INTO quotations (rfq_id, vendor_id, tax_percent, notes, status)
         VALUES ($1, $2, $3, $4, 'draft')
         RETURNING *`,
        [rfq_id, vendorId, tax_percent, notes]
      );
      const quotation = qResult.rows[0];

      // Insert line items with calculated totals
      for (const item of line_items) {
        const total = parseFloat((item.qty * item.unit_price).toFixed(2));
        await client.query(
          `INSERT INTO quotation_line_items
             (quotation_id, item_name, quantity, unit_price, total, delivery_days)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            quotation.id,
            item.item_name.trim(),
            item.qty,
            item.unit_price,
            total,
            item.delivery_days ?? null,
          ]
        );
      }

      await client.query('COMMIT');

      logActivity(
        req.user.userId,
        'CREATE',
        quotation.id,
        `Created draft quotation #${quotation.id} for RFQ #${rfq_id}: ${rfqCheck.rows[0].title}`
      );

      const full = await getFullQuotation(quotation.id);

      return res.status(201).json({
        success: true,
        message: 'Quotation created as draft',
        quotation: full,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('POST /api/quotations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create quotation',
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/quotations/:id
// Vendor edits their own quotation — only allowed when status = 'draft'
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations/{id}:
 *   put:
 *     summary: Vendor edits a draft quotation
 *     tags: [Quotations]
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
 *               tax_percent:
 *                 type: number
 *               notes:
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
 *                     unit_price:
 *                       type: number
 *                     delivery_days:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Quotation updated
 *       400:
 *         description: Quotation is not in draft status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  roleMiddleware(['vendor']),
  quotationIdParam,
  updateQuotationValidation,
  validateRequest,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      const vendorId = await getVendorIdForUser(req.user.userId);
      if (!vendorId) {
        return res.status(403).json({
          success: false,
          message: 'No vendor profile linked to your account',
        });
      }

      // Load quotation
      const current = await pool.query(
        'SELECT * FROM quotations WHERE id = $1',
        [id]
      );
      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      const prev = current.rows[0];

      // Ownership check
      if (prev.vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This quotation does not belong to you.',
        });
      }

      // Status check
      if (prev.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: `Quotation cannot be edited. Current status is '${prev.status}'. Only draft quotations can be updated.`,
        });
      }

      const {
        tax_percent = prev.tax_percent,
        notes       = prev.notes,
        line_items,
      } = req.body;

      await client.query('BEGIN');

      // Update header
      await client.query(
        `UPDATE quotations
            SET tax_percent = $1,
                notes       = $2,
                updated_at  = CURRENT_TIMESTAMP
          WHERE id = $3`,
        [tax_percent, notes, id]
      );

      // Replace line items if provided
      if (line_items && line_items.length > 0) {
        await client.query(
          'DELETE FROM quotation_line_items WHERE quotation_id = $1',
          [id]
        );
        for (const item of line_items) {
          const total = parseFloat((item.qty * item.unit_price).toFixed(2));
          await client.query(
            `INSERT INTO quotation_line_items
               (quotation_id, item_name, quantity, unit_price, total, delivery_days)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              item.item_name.trim(),
              item.qty,
              item.unit_price,
              total,
              item.delivery_days ?? null,
            ]
          );
        }
      }

      await client.query('COMMIT');

      logActivity(
        req.user.userId,
        'UPDATE',
        id,
        `Updated draft quotation #${id}`
      );

      const full = await getFullQuotation(id);

      return res.json({
        success: true,
        message: 'Quotation updated successfully',
        quotation: full,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('PUT /api/quotations/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update quotation',
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/quotations/:id/submit
// Vendor changes their quotation status from 'draft' → 'submitted'
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations/{id}/submit:
 *   patch:
 *     summary: Vendor submits a draft quotation
 *     tags: [Quotations]
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
 *         description: Quotation submitted
 *       400:
 *         description: Quotation is not in draft status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.patch(
  '/:id/submit',
  roleMiddleware(['vendor']),
  quotationIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      const vendorId = await getVendorIdForUser(req.user.userId);
      if (!vendorId) {
        return res.status(403).json({
          success: false,
          message: 'No vendor profile linked to your account',
        });
      }

      const current = await pool.query(
        'SELECT * FROM quotations WHERE id = $1',
        [id]
      );
      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      const prev = current.rows[0];

      if (prev.vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This quotation does not belong to you.',
        });
      }

      if (prev.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: `Quotation cannot be submitted. Current status is '${prev.status}'. Only draft quotations can be submitted.`,
        });
      }

      // Ensure there is at least one line item before submitting
      const lineCheck = await pool.query(
        'SELECT COUNT(*) AS cnt FROM quotation_line_items WHERE quotation_id = $1',
        [id]
      );
      if (parseInt(lineCheck.rows[0].cnt, 10) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot submit a quotation with no line items',
        });
      }

      await pool.query(
        `UPDATE quotations
            SET status       = 'submitted',
                submitted_at = CURRENT_TIMESTAMP,
                updated_at   = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [id]
      );

      logActivity(
        req.user.userId,
        'SUBMIT',
        id,
        `Submitted quotation #${id} for RFQ #${prev.rfq_id}`
      );

      const full = await getFullQuotation(id);

      return res.json({
        success: true,
        message: 'Quotation submitted successfully',
        quotation: full,
      });
    } catch (error) {
      console.error('PATCH /api/quotations/:id/submit error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit quotation',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/quotations?rfq_id=X
// Procurement officer / admin — list all submitted quotations for an RFQ
// Includes calculated subtotal, GST amount, grand total
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: Get all submitted quotations for an RFQ (procurement officer only)
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rfq_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The RFQ to fetch quotations for
 *     responses:
 *       200:
 *         description: List of submitted quotations with financials
 *       400:
 *         description: rfq_id is required
 *       403:
 *         description: Procurement officer / admin only
 *       404:
 *         description: RFQ not found
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  roleMiddleware(['admin', 'procurement_officer']),
  listQuotationsValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { rfq_id } = req.query;

      // Confirm RFQ exists
      const rfqCheck = await pool.query(
        'SELECT id, title, status FROM rfqs WHERE id = $1',
        [rfq_id]
      );
      if (rfqCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'RFQ not found' });
      }

      // Fetch all submitted quotations for this RFQ
      const qResult = await pool.query(
        `SELECT
             q.id,
             q.rfq_id,
             q.vendor_id,
             v.company_name  AS vendor_name,
             v.contact_email AS vendor_email,
             q.tax_percent,
             q.notes,
             q.status,
             q.submitted_at,
             q.created_at,
             q.updated_at
           FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id
          WHERE q.rfq_id = $1
            AND q.status = 'submitted'
          ORDER BY q.submitted_at ASC`,
        [rfq_id]
      );

      // Attach line items + computed financials to each quotation
      const quotations = await Promise.all(
        qResult.rows.map(async (q) => {
          const lineItems = await pool.query(
            `SELECT id, item_name, quantity, unit_price, total, delivery_days
               FROM quotation_line_items
              WHERE quotation_id = $1
              ORDER BY id`,
            [q.id]
          );

          const subtotal   = lineItems.rows.reduce((sum, li) => sum + parseFloat(li.total), 0);
          const taxPercent = parseFloat(q.tax_percent) || 0;
          const gstAmount  = parseFloat(((subtotal * taxPercent) / 100).toFixed(2));
          const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

          return {
            ...q,
            line_items:  lineItems.rows,
            subtotal:    parseFloat(subtotal.toFixed(2)),
            gst_amount:  gstAmount,
            grand_total: grandTotal,
          };
        })
      );

      return res.json({
        success: true,
        rfq_id:    parseInt(rfq_id, 10),
        rfq_title: rfqCheck.rows[0].title,
        count:     quotations.length,
        quotations,
      });
    } catch (error) {
      console.error('GET /api/quotations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotations',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/quotations/:id
// Get full quotation detail
// Vendor can only view their own; officer/admin can view any
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations/{id}:
 *   get:
 *     summary: Get full quotation detail
 *     tags: [Quotations]
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
 *         description: Full quotation detail with line items and financials
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  quotationIdParam,
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;

      const full = await getFullQuotation(id);
      if (!full) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      // Vendor can only see their own quotation
      if (req.user.role === 'vendor') {
        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId || full.vendor_id !== vendorId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This quotation does not belong to you.',
          });
        }
      }

      return res.json({ success: true, quotation: full });
    } catch (error) {
      console.error('GET /api/quotations/:id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotation',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/quotations/:id/select
// Mark a quotation as 'selected', all others for the same RFQ as 'rejected'
// Triggers approval workflow: inserts the first approval record (level 1)
// Logs to activity_logs
// Procurement officer / admin only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/quotations/{id}/select:
 *   patch:
 *     summary: Select a quotation — triggers approval workflow
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approver_id:
 *                 type: integer
 *                 description: User ID of the first-level approver (defaults to a manager in the system)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Quotation selected and approval workflow created
 *       400:
 *         description: Quotation is not in submitted status
 *       403:
 *         description: Procurement officer / admin only
 *       404:
 *         description: Quotation not found
 *       500:
 *         description: Server error
 */
router.patch(
  '/:id/select',
  roleMiddleware(['admin', 'procurement_officer']),
  quotationIdParam,
  validateRequest,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { approver_id } = req.body;

      // Load quotation
      const qCheck = await pool.query(
        `SELECT q.*, v.company_name AS vendor_name, r.title AS rfq_title
           FROM quotations q
           JOIN vendors v ON v.id = q.vendor_id
           JOIN rfqs    r ON r.id = q.rfq_id
          WHERE q.id = $1`,
        [id]
      );
      if (qCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found' });
      }

      const quotation = qCheck.rows[0];

      if (quotation.status !== 'submitted') {
        return res.status(400).json({
          success: false,
          message: `Quotation cannot be selected. Current status is '${quotation.status}'. Only submitted quotations can be selected.`,
        });
      }

      // Resolve approver: use provided approver_id or fall back to first manager in DB
      let resolvedApproverId = approver_id ? parseInt(approver_id, 10) : null;

      if (resolvedApproverId) {
        const approverCheck = await pool.query(
          `SELECT id FROM users WHERE id = $1 AND role IN ('admin', 'manager', 'procurement_officer')`,
          [resolvedApproverId]
        );
        if (approverCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'approver_id does not reference a valid user with an approval-capable role (admin, manager, procurement_officer)',
          });
        }
      } else {
        // Auto-pick the first available manager
        const managerResult = await pool.query(
          `SELECT id FROM users WHERE role = 'manager' ORDER BY id LIMIT 1`
        );
        if (managerResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No manager found in the system to assign as approver. Please provide an approver_id.',
          });
        }
        resolvedApproverId = managerResult.rows[0].id;
      }

      await client.query('BEGIN');

      // 1. Mark this quotation as 'selected'
      await client.query(
        `UPDATE quotations
            SET status     = 'selected',
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [id]
      );

      // 2. Reject all other submitted/draft quotations for the same RFQ
      await client.query(
        `UPDATE quotations
            SET status     = 'rejected',
                updated_at = CURRENT_TIMESTAMP
          WHERE rfq_id = $1
            AND id     != $2
            AND status IN ('submitted', 'draft')`,
        [quotation.rfq_id, id]
      );

      // 3. Insert the first approval record (level 1, status pending)
      const approvalResult = await client.query(
        `INSERT INTO approvals (rfq_id, quotation_id, approver_id, level, status)
         VALUES ($1, $2, $3, 1, 'pending')
         RETURNING *`,
        [quotation.rfq_id, id, resolvedApproverId]
      );

      await client.query('COMMIT');

      const approval = approvalResult.rows[0];

      // 4. Log activity
      logActivity(
        req.user.userId,
        'SELECT',
        id,
        `Selected quotation #${id} from ${quotation.vendor_name} for RFQ #${quotation.rfq_id}: ${quotation.rfq_title}`
      );

      pool.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
         VALUES ($1, 'APPROVAL_CREATED', 'APPROVAL', $2, $3)`,
        [
          req.user.userId,
          approval.id,
          `Approval workflow initiated for quotation #${id} (RFQ #${quotation.rfq_id}) — assigned to approver ID ${resolvedApproverId}`,
        ]
      ).catch((err) => console.error('Activity log error:', err));

      const full = await getFullQuotation(id);

      return res.json({
        success: true,
        message: 'Quotation selected. Approval workflow initiated.',
        quotation: full,
        approval: {
          id:          approval.id,
          rfq_id:      approval.rfq_id,
          quotation_id: approval.quotation_id,
          approver_id: approval.approver_id,
          level:       approval.level,
          status:      approval.status,
          created_at:  approval.created_at,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('PATCH /api/quotations/:id/select error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to select quotation',
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
