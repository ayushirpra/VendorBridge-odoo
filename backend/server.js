const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const pool = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const roleMiddleware = require('./middleware/roleMiddleware');
const { sanitizeRequest } = require('./middleware/sanitization');
const { apiLimiter } = require('./middleware/rateLimiter');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Swagger UI to work
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors());

// Rate limiting
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeRequest);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Root
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Welcome message
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to VendorBridge ERP API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      dbTest: '/api/db-test',
      auth: '/api/auth',
      vendors: '/api/vendors',
      rfqs: '/api/rfqs',
      quotations: '/api/quotations',
      approvals: '/api/approvals',
      purchaseOrders: '/api/purchase-orders',
      activityLogs:   '/api/activity-logs',
      reports:        '/api/reports'
    }
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /api/db-test:
 *   get:
 *     summary: Database connection test
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database connection successful
 *       500:
 *         description: Database connection failed
 */
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    res.json({ 
      status: 'Database connected', 
      timestamp: result.rows[0].time,
      version: result.rows[0].version
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: error.message 
    });
  }
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VendorBridge API Documentation'
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/rfqs', require('./routes/rfqs'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/activity-logs',   require('./routes/activityLogs'));
app.use('/api/reports',         require('./routes/reports'));

// Protected route example with role-based access
/**
 * @swagger
 * /api/protected/admin:
 *   get:
 *     summary: Admin only endpoint (example)
 *     tags: [Protected Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
app.get('/api/protected/admin', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to admin area',
    user: req.user
  });
});

/**
 * @swagger
 * /api/protected/procurement:
 *   get:
 *     summary: Procurement officer and admin endpoint (example)
 *     tags: [Protected Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Required role not met
 */
app.get('/api/protected/procurement', authMiddleware, roleMiddleware(['admin', 'procurement_officer']), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to procurement area',
    user: req.user
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VendorBridge ERP Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(60) + '\n');
});
