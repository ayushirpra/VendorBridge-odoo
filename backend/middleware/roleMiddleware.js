/**
 * Role-Based Authorization Middleware
 * Checks if user's role is in the allowed roles array
 * Must be used after authMiddleware
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (authMiddleware should run first)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please login first.'
        });
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access forbidden. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed.',
        error: error.message
      });
    }
  };
};

module.exports = roleMiddleware;
