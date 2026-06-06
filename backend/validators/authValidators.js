const { body } = require('express-validator');

// Valid user roles
const VALID_ROLES = ['admin', 'procurement_officer', 'vendor', 'manager'];

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name can only contain letters and spaces'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Last name can only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Please provide a valid phone number'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),

  body('profile_photo_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('Profile photo URL must be a valid URL')
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Validation rules for forgot password
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  VALID_ROLES
};
