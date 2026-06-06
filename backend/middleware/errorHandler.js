const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns structured response
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('Global Error Handler:', err);

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Something went wrong!';

  // Structured error response
  const errorResponse = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation failed';
    errorResponse.errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Invalid token';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Token expired';
    return res.status(401).json(errorResponse);
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    errorResponse.error = 'Duplicate entry - resource already exists';
    return res.status(409).json(errorResponse);
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    errorResponse.error = 'Referenced resource not found';
    return res.status(404).json(errorResponse);
  }

  if (err.code === '22P02') { // PostgreSQL invalid input syntax
    errorResponse.error = 'Invalid input format';
    return res.status(400).json(errorResponse);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unknown routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  handleValidationErrors,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler
};
