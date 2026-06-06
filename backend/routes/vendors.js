const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// All vendor routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors
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
 *         description: Filter by vendor category
 *     responses:
 *       200:
 *         description: List of vendors
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      vendors: result.rows
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get single vendor by ID
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
 *         description: Vendor details
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    res.json({
      success: true,
      vendor: result.rows[0]
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create new vendor (Admin or Procurement Officer only)
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
 *         description: Vendor created successfully
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', roleMiddleware(['admin', 'procurement_officer']), async (req, res) => {
  try {
    const { company_name, category, gst_number, contact_name, contact_email, contact_phone, address, status } = req.body;
    
    // Validate required fields
    if (!company_name || !contact_name || !contact_email) {
      return res.status(400).json({
        success: false,
        message: 'Company name, contact name, and contact email are required'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO vendors (company_name, category, gst_number, contact_name, contact_email, contact_phone, address, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        company_name, 
        category || null, 
        gst_number || null, 
        contact_name, 
        contact_email, 
        contact_phone || null, 
        address || null, 
        status || 'pending',
        req.user.userId
      ]
    );
    
    const vendor = result.rows[0];
    
    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'CREATE', 'VENDOR', vendor.id, `Created vendor: ${vendor.company_name}`]
    );
    
    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      vendor
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'Vendor with this GST number or email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: Update vendor (Admin or Procurement Officer only)
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
 *               status:
 *                 type: string
 *                 enum: [active, pending, blocked]
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       404:
 *         description: Vendor not found
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/:id', roleMiddleware(['admin', 'procurement_officer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, category, gst_number, contact_name, contact_email, contact_phone, address, status } = req.body;
    
    const result = await pool.query(
      `UPDATE vendors 
       SET company_name = $1, category = $2, gst_number = $3, contact_name = $4, 
           contact_email = $5, contact_phone = $6, address = $7, status = $8, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [company_name, category, gst_number, contact_name, contact_email, contact_phone, address, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    const vendor = result.rows[0];
    
    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'UPDATE', 'VENDOR', vendor.id, `Updated vendor: ${vendor.company_name}`]
    );
    
    res.json({
      success: true,
      message: 'Vendor updated successfully',
      vendor
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message
    });
  }
});

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
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.delete('/:id', roleMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }
    
    const vendor = result.rows[0];
    
    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'DELETE', 'VENDOR', vendor.id, `Deleted vendor: ${vendor.company_name}`]
    );
    
    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message
    });
  }
});

module.exports = router;
