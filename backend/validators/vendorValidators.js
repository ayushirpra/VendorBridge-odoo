const { body, param, query } = require('express-validator');

// Allowed vendor status values (must match DB enum)
const VALID_STATUSES = ['active', 'pending', 'blocked'];

// GST number: exactly 15 uppercase alphanumeric chars
// Format: 2-digit state code + 10-char PAN + 1 entity code + 'Z' + 1 check digit
// We validate the broad shape: 15 alphanumeric characters (uppercase enforced via transform)
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── List / filter query validators ──────────────────────────────────────────
const listVendorsValidation = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('category must be 100 characters or fewer'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('search term must be 200 characters or fewer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
    .toInt(),
];

// ─── Create vendor body validators ───────────────────────────────────────────
const createVendorValidation = [
  body('company_name')
    .trim()
    .notEmpty().withMessage('company_name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('company_name must be between 2 and 255 characters'),

  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('category must be 100 characters or fewer'),

  body('gst_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .toUpperCase()
    .isLength({ min: 15, max: 15 })
    .withMessage('gst_number must be exactly 15 characters')
    .matches(GST_REGEX)
    .withMessage(
      'gst_number format is invalid. Expected: 2-digit state + 5-letter PAN prefix + 4 digits + 1 letter + 1 entity + Z + 1 check (e.g. 29ABCDE1234F1Z5)'
    ),

  body('contact_name')
    .trim()
    .notEmpty().withMessage('contact_name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('contact_name must be between 2 and 100 characters'),

  body('contact_email')
    .trim()
    .notEmpty().withMessage('contact_email is required')
    .isEmail().withMessage('contact_email must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('contact_email must be 255 characters or fewer'),

  body('contact_phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('contact_phone must contain only digits, spaces, +, -, (, )')
    .isLength({ max: 20 })
    .withMessage('contact_phone must be 20 characters or fewer'),

  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('address must be 1000 characters or fewer'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
];

// ─── Update vendor body validators (all fields optional) ─────────────────────
const updateVendorValidation = [
  body('company_name')
    .optional()
    .trim()
    .notEmpty().withMessage('company_name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('company_name must be between 2 and 255 characters'),

  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('category must be 100 characters or fewer'),

  body('gst_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .toUpperCase()
    .isLength({ min: 15, max: 15 })
    .withMessage('gst_number must be exactly 15 characters')
    .matches(GST_REGEX)
    .withMessage(
      'gst_number format is invalid. Expected format: 29ABCDE1234F1Z5'
    ),

  body('contact_name')
    .optional()
    .trim()
    .notEmpty().withMessage('contact_name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('contact_name must be between 2 and 100 characters'),

  body('contact_email')
    .optional()
    .trim()
    .isEmail().withMessage('contact_email must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('contact_email must be 255 characters or fewer'),

  body('contact_phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('contact_phone must contain only digits, spaces, +, -, (, )')
    .isLength({ max: 20 })
    .withMessage('contact_phone must be 20 characters or fewer'),

  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('address must be 1000 characters or fewer'),
];

// ─── Status patch validator ───────────────────────────────────────────────────
const patchStatusValidation = [
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('reason')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('reason must be 500 characters or fewer'),
];

// ─── ID param validator (shared) ──────────────────────────────────────────────
const vendorIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

module.exports = {
  listVendorsValidation,
  createVendorValidation,
  updateVendorValidation,
  patchStatusValidation,
  vendorIdParam,
  VALID_STATUSES,
};
