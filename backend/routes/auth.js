const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { registerValidation, loginValidation, forgotPasswordValidation } = require('../validators/authValidators');
const validateRequest = require('../middleware/validationMiddleware');
const crypto = require('crypto');

const router = express.Router();

// In-memory storage for reset tokens (in production, use Redis or database)
const resetTokens = new Map();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Password123
 *               phone:
 *                 type: string
 *                 example: +1-555-1234
 *               role:
 *                 type: string
 *                 enum: [admin, procurement_officer, vendor, manager]
 *                 example: procurement_officer
 *               profile_photo_url:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/photo.jpg
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, role, profile_photo_url } = req.body;

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password with bcrypt (10 salt rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, role, profile_photo_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, first_name, last_name, email, role, phone, profile_photo_url, created_at`,
      [first_name, last_name, email.toLowerCase(), passwordHash, phone || null, role, profile_photo_url || null]
    );

    const user = result.rows[0];

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'REGISTER', 'USER', user.id, `User registered: ${user.email}`]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_photo_url: user.profile_photo_url,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, password_hash, role, phone, profile_photo_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Compare password with hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'LOGIN', 'USER', user.id, `User logged in: ${user.email}`]
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile_photo_url: user.profile_photo_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Reset token generated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', forgotPasswordValidation, validateRequest, async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const result = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    const user = result.rows[0];

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Store token in memory (in production, store in database or Redis)
    resetTokens.set(resetToken, {
      userId: user.id,
      email: user.email,
      expiry: resetTokenExpiry
    });

    // Simulate sending email (in production, use nodemailer or email service)
    console.log('\n' + '='.repeat(70));
    console.log('📧 PASSWORD RESET EMAIL SIMULATION');
    console.log('='.repeat(70));
    console.log(`To: ${user.email}`);
    console.log(`Subject: Password Reset Request - VendorBridge`);
    console.log('-'.repeat(70));
    console.log(`Hello ${user.first_name} ${user.last_name},\n`);
    console.log(`You requested a password reset for your VendorBridge account.`);
    console.log(`\nYour password reset token is:\n`);
    console.log(`  ${resetToken}`);
    console.log(`\nThis token will expire in 1 hour.`);
    console.log(`\nUse this token with the reset-password endpoint.`);
    console.log(`\nIf you didn't request this, please ignore this email.`);
    console.log('='.repeat(70) + '\n');

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'PASSWORD_RESET_REQUEST', 'USER', user.id, `Password reset requested for: ${user.email}`]
    );

    res.json({
      success: true,
      message: 'Password reset token generated. Check server console for the token (in production, this would be sent via email).',
      resetToken, // In production, don't send this in response, only via email
      expiresIn: '1 hour'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 example: abc123def456...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if token exists and is valid
    const tokenData = resetTokens.get(resetToken);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token is expired
    if (Date.now() > tokenData.expiry) {
      resetTokens.delete(resetToken);
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new one.'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, tokenData.userId]
    );

    // Delete used token
    resetTokens.delete(resetToken);

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
      [tokenData.userId, 'PASSWORD_RESET', 'USER', tokenData.userId, `Password reset completed for: ${tokenData.email}`]
    );

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

module.exports = router;
