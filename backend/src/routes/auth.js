const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Validation middleware helper
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
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required and must be less than 100 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required and must be less than 100 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('companyName')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Company name must be less than 255 characters'),
    body('roles')
      .optional()
      .isArray()
      .withMessage('Roles must be an array')
      .custom((roles) => {
        const validRoles = ['carrier', 'shipper', 'broker', 'consignee'];
        const invalidRoles = roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
          throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
        }
        return true;
      })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      companyName,
      roles
    } = req.body;

    const user = await authService.registerUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      companyName,
      roles: roles || ['shipper'] // Default role
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          companyName: user.company_name,
          roles: user.roles,
          isActive: user.is_active,
          createdAt: user.created_at
        },
        message: 'User registered successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public
 */
router.post('/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Gather session information
    const sessionInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo: {
        platform: req.get('X-Platform') || 'web',
        version: req.get('X-App-Version') || '1.0.0'
      }
    };

    const result = await authService.authenticateUser(email, password, sessionInfo);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          phone: result.user.phone,
          companyName: result.user.company_name,
          roles: result.user.roles,
          isActive: result.user.is_active,
          emailVerified: result.user.email_verified,
          lastLogin: result.user.last_login
        },
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
          tokenType: result.tokens.tokenType
        },
        message: 'Authentication successful'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh',
  asyncHandler(async (req, res) => {
    // Try to get refresh token from cookie or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const tokens = await authService.refreshTokens(refreshToken);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType
        },
        message: 'Tokens refreshed successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logout(req.token);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout all sessions for the user
 * @access  Private
 */
router.post('/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessionCount = await authService.logoutAllSessions(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      data: {
        message: `Logged out from ${sessionCount} sessions`,
        sessionCount
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.first_name,
          lastName: req.user.last_name,
          phone: req.user.phone,
          companyName: req.user.company_name,
          roles: req.user.roles,
          isActive: req.user.is_active,
          emailVerified: req.user.email_verified
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   GET /api/v1/auth/verify-token
 * @desc    Verify if current token is valid
 * @access  Private
 */
router.get('/verify-token',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          roles: req.user.roles
        },
        message: 'Token is valid'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      })
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // This would be implemented in authService.changePassword()
    // For now, just return success message
    res.json({
      success: true,
      data: {
        message: 'Password change functionality will be implemented in next iteration'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  })
);

module.exports = router;