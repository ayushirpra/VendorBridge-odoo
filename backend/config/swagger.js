const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VendorBridge ERP API',
      version: '1.0.0',
      description: 'Complete ERP system for vendor and procurement management',
      contact: {
        name: 'VendorBridge Support',
        email: 'support@vendorbridge.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+1-555-1234' },
            role: { 
              type: 'string', 
              enum: ['admin', 'procurement_officer', 'vendor', 'manager'],
              example: 'procurement_officer'
            },
            profile_photo_url: { type: 'string', format: 'uri', example: 'https://example.com/photo.jpg' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            company_name: { type: 'string', example: 'TechSupplies Inc' },
            category: { type: 'string', example: 'Electronics' },
            gst_number: { type: 'string', example: '29ABCDE1234F1Z5' },
            contact_name: { type: 'string', example: 'Robert Smith' },
            contact_email: { type: 'string', format: 'email', example: 'robert@techsupplies.com' },
            contact_phone: { type: 'string', example: '+1-555-1001' },
            address: { type: 'string', example: '123 Tech Street, Silicon Valley, CA 94025' },
            status: { 
              type: 'string', 
              enum: ['active', 'pending', 'blocked'],
              example: 'active'
            },
            created_by: { type: 'integer', example: 2 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
