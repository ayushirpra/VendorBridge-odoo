const { param, body, validationResult } = require('express-validator');

// Validation for PO ID in route params
const poIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Purchase Order ID must be a positive integer'),
];

// Validation for creating PO
const createPOValidation = [
  body('quotation_id')
    .isInt({ min: 1 })
    .withMessage('Quotation ID is required and must be a positive integer'),
];

// Validation for updating PO status
const updatePOStatusValidation = [
  body('status')
    .isIn(['draft', 'approved', 'pending_payment', 'paid'])
    .withMessage('Status must be one of: draft, approved, pending_payment, paid'),
];

module.exports = {
  poIdParam,
  createPOValidation,
  updatePOStatusValidation,
};
