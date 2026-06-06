const { param, body, query, validationResult } = require('express-validator');

// Validation for approval ID in route params
const approvalIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Approval ID must be a positive integer'),
];

// Validation for approval action
const approvalActionValidation = [
  body('action')
    .isIn(['approved', 'rejected'])
    .withMessage('Action must be either "approved" or "rejected"'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string if provided'),
];

// Validation for list approvals query params
const listApprovalsValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be pending, approved, or rejected'),
  query('rfq_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('RFQ ID must be a positive integer'),
];

module.exports = {
  approvalIdParam,
  approvalActionValidation,
  listApprovalsValidation,
};
