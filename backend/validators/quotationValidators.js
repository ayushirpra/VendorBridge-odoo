const { body, param, query } = require('express-validator');

// ─── Shared param validator ───────────────────────────────────────────────────
const quotationIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

// ─── Create quotation ─────────────────────────────────────────────────────────
const createQuotationValidation = [
  body('rfq_id')
    .notEmpty().withMessage('rfq_id is required')
    .isInt({ min: 1 }).withMessage('rfq_id must be a positive integer')
    .toInt(),

  body('tax_percent')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('tax_percent must be a number between 0 and 100')
    .toFloat(),

  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be 2000 characters or fewer'),

  body('line_items')
    .isArray({ min: 1 })
    .withMessage('line_items must be a non-empty array'),

  body('line_items.*.item_name')
    .trim()
    .notEmpty().withMessage('each line item must have an item_name')
    .isLength({ max: 255 }).withMessage('item_name must be 255 characters or fewer'),

  body('line_items.*.qty')
    .notEmpty().withMessage('each line item must have a qty')
    .isFloat({ gt: 0 }).withMessage('qty must be a positive number')
    .toFloat(),

  body('line_items.*.unit_price')
    .notEmpty().withMessage('each line item must have a unit_price')
    .isFloat({ min: 0 }).withMessage('unit_price must be a non-negative number')
    .toFloat(),

  body('line_items.*.delivery_days')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('delivery_days must be a non-negative integer')
    .toInt(),
];

// ─── Update quotation (all fields optional, same rules) ───────────────────────
const updateQuotationValidation = [
  body('tax_percent')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('tax_percent must be a number between 0 and 100')
    .toFloat(),

  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be 2000 characters or fewer'),

  body('line_items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('line_items must be a non-empty array when provided'),

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

  body('line_items.*.unit_price')
    .if(body('line_items').exists())
    .notEmpty().withMessage('each line item must have a unit_price')
    .isFloat({ min: 0 }).withMessage('unit_price must be a non-negative number')
    .toFloat(),

  body('line_items.*.delivery_days')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('delivery_days must be a non-negative integer')
    .toInt(),
];

// ─── List quotations query filter ─────────────────────────────────────────────
const listQuotationsValidation = [
  query('rfq_id')
    .notEmpty().withMessage('rfq_id query parameter is required')
    .isInt({ min: 1 }).withMessage('rfq_id must be a positive integer')
    .toInt(),
];

module.exports = {
  quotationIdParam,
  createQuotationValidation,
  updateQuotationValidation,
  listQuotationsValidation,
};
