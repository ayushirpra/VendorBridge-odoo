const { body, param, query } = require('express-validator');

// ─── Shared param validator ───────────────────────────────────────────────────
const rfqIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

// ─── Create RFQ ───────────────────────────────────────────────────────────────
const createRfqValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('title is required')
    .isLength({ min: 3, max: 255 }).withMessage('title must be between 3 and 255 characters'),

  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('category must be 100 characters or fewer'),

  body('deadline')
    .notEmpty().withMessage('deadline is required')
    .isISO8601().withMessage('deadline must be a valid ISO 8601 date (e.g. 2026-07-15T17:00:00)')
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('deadline must be in the future');
      }
      return true;
    }),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 }).withMessage('description must be 5000 characters or fewer'),

  body('line_items')
    .isArray({ min: 1 }).withMessage('line_items must be a non-empty array'),

  body('line_items.*.item_name')
    .trim()
    .notEmpty().withMessage('each line item must have an item_name')
    .isLength({ max: 255 }).withMessage('item_name must be 255 characters or fewer'),

  body('line_items.*.qty')
    .notEmpty().withMessage('each line item must have a qty')
    .isFloat({ gt: 0 }).withMessage('qty must be a positive number')
    .toFloat(),

  body('line_items.*.unit')
    .trim()
    .notEmpty().withMessage('each line item must have a unit')
    .isLength({ max: 50 }).withMessage('unit must be 50 characters or fewer'),

  body('vendor_ids')
    .isArray({ min: 1 }).withMessage('vendor_ids must be a non-empty array'),

  body('vendor_ids.*')
    .isInt({ min: 1 }).withMessage('each vendor_id must be a positive integer')
    .toInt(),
];

// ─── Update RFQ (all fields optional, same rules) ────────────────────────────
const updateRfqValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('title cannot be empty')
    .isLength({ min: 3, max: 255 }).withMessage('title must be between 3 and 255 characters'),

  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('category must be 100 characters or fewer'),

  body('deadline')
    .optional()
    .isISO8601().withMessage('deadline must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('deadline must be in the future');
      }
      return true;
    }),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 }).withMessage('description must be 5000 characters or fewer'),

  body('line_items')
    .optional()
    .isArray({ min: 1 }).withMessage('line_items must be a non-empty array when provided'),

  body('line_items.*.item_name')
    .if(body('line_items').exists())
    .trim()
    .notEmpty().withMessage('each line item must have an item_name')
    .isLength({ max: 255 }).withMessage('item_name must be 255 characters or fewer'),

  body('line_items.*.qty')
    .if(body('line_items').exists())
    .notEmpty().withMessage('each line item must have a qty')
    .isFloat({ gt: 0 }).withMessage('qty must be a positive number')
    .toFloat(),

  body('line_items.*.unit')
    .if(body('line_items').exists())
    .trim()
    .notEmpty().withMessage('each line item must have a unit')
    .isLength({ max: 50 }).withMessage('unit must be 50 characters or fewer'),

  body('vendor_ids')
    .optional()
    .isArray({ min: 1 }).withMessage('vendor_ids must be a non-empty array when provided'),

  body('vendor_ids.*')
    .if(body('vendor_ids').exists())
    .isInt({ min: 1 }).withMessage('each vendor_id must be a positive integer')
    .toInt(),
];

// ─── List RFQ query filters ───────────────────────────────────────────────────
const listRfqsValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'published', 'closed'])
    .withMessage('status must be one of: draft, published, closed'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('offset must be a non-negative integer')
    .toInt(),
];

module.exports = {
  rfqIdParam,
  createRfqValidation,
  updateRfqValidation,
  listRfqsValidation,
};
