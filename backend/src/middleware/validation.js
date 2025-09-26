const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, error) => {
      acc[error.param] = error.msg;
      return acc;
    }, {});

    throw new ValidationError('Validation failed', errorDetails);
  }
  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  // Password validation
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Name validation
  firstName: () => body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),

  lastName: () => body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),

  // Phone validation
  phone: () => body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),

  // Company validation
  companyName: () => body('companyName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name must be less than 255 characters'),

  // Roles validation
  roles: () => body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array')
    .custom((roles) => {
      const validRoles = ['admin', 'carrier', 'shipper', 'broker', 'consignee'];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
      }
      return true;
    }),

  // ID validation
  id: (paramName = 'id') => param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`),

  // UUID validation
  uuid: (paramName = 'id') => param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // BoL status validation
  bolStatus: () => body('status')
    .isIn([
      'pending',
      'approved',
      'assigned',
      'accepted',
      'picked_up',
      'en_route',
      'delivered',
      'unpaid',
      'paid'
    ])
    .withMessage('Invalid BoL status')
};

/**
 * Validation middleware for user registration
 */
const validateUserRegistration = [
  validationRules.email(),
  validationRules.password(),
  validationRules.firstName(),
  validationRules.lastName(),
  validationRules.phone(),
  validationRules.companyName(),
  validationRules.roles(),
  handleValidationErrors
];

/**
 * Validation middleware for user login
 */
const validateUserLogin = [
  validationRules.email(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation middleware for password change
 */
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  validationRules.password().if(body('newPassword').exists()),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation middleware for BoL status update
 */
const validateBoLStatusUpdate = [
  validationRules.bolStatus(),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validationRules,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateBoLStatusUpdate
};