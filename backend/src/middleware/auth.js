const authService = require('../services/authService');
const { RBACService } = require('../services/rbacService');
const logger = require('../utils/logger');

/**
 * Authentication middleware for protecting routes and managing user sessions
 */

/**
 * Extract JWT token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
};

/**
 * Middleware to authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token is required',
          code: 'MISSING_TOKEN'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    // Validate session and get user data
    const user = await authService.validateSession(token);

    // Attach user to request object
    req.user = user;
    req.token = token;

    // Add user context to logger
    req.logger = logger.child({
      userId: user.id,
      email: user.email,
      requestId: req.id
    });

    next();

  } catch (error) {
    logger.debug('Authentication failed', {
      error: error.message,
      requestId: req.id,
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
};

/**
 * Middleware to check if user has required roles
 * @param {Array<string>} requiredRoles - Array of required roles
 * @param {boolean} requireAll - Whether user must have ALL roles (default: false, requires ANY)
 * @returns {Function} Middleware function
 */
const requireRole = (requiredRoles, requireAll = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const userRoles = req.user.roles || [];

    // Admin role has access to everything
    if (userRoles.includes('admin')) {
      return next();
    }

    // Check role requirements
    let hasRequiredRole;

    if (requireAll) {
      // User must have ALL required roles
      hasRequiredRole = requiredRoles.every(role => userRoles.includes(role));
    } else {
      // User must have at least ONE required role
      hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    }

    if (!hasRequiredRole) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRoles,
        requiredRoles,
        requireAll,
        requestId: req.id
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            requiredRoles,
            userRoles: userRoles.filter(role => role !== 'admin'), // Don't expose admin role
            requireAll
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has permission to access specific resource
 * @param {Function} permissionCheck - Function to check permission (req, res) => boolean
 * @returns {Function} Middleware function
 */
const requirePermissionCheck = (permissionCheck) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await permissionCheck(req, res);

      if (!hasPermission) {
        logger.warn('Resource access denied', {
          userId: req.user?.id,
          resource: req.originalUrl,
          method: req.method,
          requestId: req.id
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied to this resource',
            code: 'RESOURCE_ACCESS_DENIED'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      next();

    } catch (error) {
      logger.error('Permission check failed', error, {
        userId: req.user?.id,
        requestId: req.id
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Permission check failed',
          code: 'PERMISSION_CHECK_ERROR'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const user = await authService.validateSession(token);
      req.user = user;
      req.token = token;

      req.logger = logger.child({
        userId: user.id,
        email: user.email,
        requestId: req.id
      });
    }

    next();

  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    logger.debug('Optional authentication failed', {
      error: error.message,
      requestId: req.id
    });

    next();
  }
};

/**
 * Helper function to get effective role for multi-role users
 * Returns the highest priority role based on hierarchy: admin > carrier > broker > shipper > consignee
 * @param {Array<string>} roles - User's roles
 * @returns {string} Effective role
 */
const getEffectiveRole = (roles) => {
  return RBACService.getEffectiveRole({ roles });
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const hasPermission = RBACService.hasPermission(req.user, permission);

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredPermission: permission,
        requestId: req.id
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            requiredPermission: permission,
            userRoles: req.user.roles
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {Array<string>} permissions - Array of permissions (user needs ANY one)
 * @returns {Function} Middleware function
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const hasAnyPermission = RBACService.hasAnyPermission(req.user, permissions);

    if (!hasAnyPermission) {
      logger.warn('Permission denied - insufficient permissions', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredPermissions: permissions,
        requestId: req.id
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            requiredPermissions: permissions,
            userRoles: req.user.roles,
            note: 'User needs at least one of the required permissions'
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has all specified permissions
 * @param {Array<string>} permissions - Array of permissions (user needs ALL)
 * @returns {Function} Middleware function
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const hasAllPermissions = RBACService.hasAllPermissions(req.user, permissions);

    if (!hasAllPermissions) {
      logger.warn('Permission denied - missing required permissions', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredPermissions: permissions,
        requestId: req.id
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            requiredPermissions: permissions,
            userRoles: req.user.roles,
            note: 'User needs all of the required permissions'
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check BoL status transition permissions
 * @param {Function} getStatusData - Function to extract current and target status from request
 * @returns {Function} Middleware function
 */
const requireStatusTransition = (getStatusData) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    try {
      const { fromStatus, toStatus } = getStatusData(req);
      const result = RBACService.canTransitionStatus(req.user, fromStatus, toStatus);

      if (!result.allowed) {
        logger.warn('Status transition denied', {
          userId: req.user.id,
          userRoles: req.user.roles,
          fromStatus,
          toStatus,
          reason: result.reason,
          requestId: req.id
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'Status transition not allowed',
            code: 'TRANSITION_NOT_ALLOWED',
            details: {
              fromStatus,
              toStatus,
              reason: result.reason
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      next();

    } catch (error) {
      logger.error('Status transition check failed', error, {
        userId: req.user?.id,
        requestId: req.id
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Status transition check failed',
          code: 'TRANSITION_CHECK_ERROR'
        }
      });
    }
  };
};

/**
 * Middleware for resource ownership validation
 * @param {Function} getResourceOwner - Function to get resource owner ID from request
 * @returns {Function} Middleware function
 */
const requireOwnershipOrAdmin = (getResourceOwner) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    try {
      // Admin can access everything
      if (req.user.roles.includes('admin')) {
        return next();
      }

      const resourceOwnerId = await getResourceOwner(req);

      if (req.user.id !== resourceOwnerId) {
        logger.warn('Resource access denied - not owner', {
          userId: req.user.id,
          resourceOwnerId,
          resource: req.originalUrl,
          requestId: req.id
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied - you can only access your own resources',
            code: 'OWNERSHIP_REQUIRED'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      next();

    } catch (error) {
      logger.error('Ownership check failed', error, {
        userId: req.user?.id,
        requestId: req.id
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Ownership check failed',
          code: 'OWNERSHIP_CHECK_ERROR'
        }
      });
    }
  };
};

/**
 * Enhanced permission checks for BoL workflow management
 */
const permissions = {
  /**
   * Check if user can manage BoL (create, update status)
   */
  canManageBoL: (req) => {
    const userRoles = req.user?.roles || [];
    return userRoles.some(role => ['admin', 'carrier', 'shipper', 'broker'].includes(role));
  },

  /**
   * Check if user can update BoL status (enhanced for workflow)
   */
  canUpdateBoLStatus: (req) => {
    const userRoles = req.user?.roles || [];
    return userRoles.some(role => ['admin', 'carrier'].includes(role));
  },

  /**
   * Check if user can view BoL (includes consignees)
   */
  canViewBoL: (req) => {
    const userRoles = req.user?.roles || [];
    return userRoles.some(role => ['admin', 'carrier', 'shipper', 'broker', 'consignee'].includes(role));
  },

  /**
   * Check if user owns resource or has admin role
   */
  ownsResourceOrAdmin: (resourceUserId) => (req) => {
    return req.user?.roles?.includes('admin') || req.user?.id === resourceUserId;
  },

  /**
   * Workflow-specific permission checks
   */
  workflow: {
    /**
     * Check if user can approve BoL (shipper/admin only)
     */
    canApprove: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'shipper'].includes(role));
    },

    /**
     * Check if user can assign carrier (broker/admin only)
     */
    canAssignCarrier: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'broker'].includes(role));
    },

    /**
     * Check if user can accept/reject assignment (carrier/admin only)
     */
    canAcceptReject: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'carrier'].includes(role));
    },

    /**
     * Check if user can update transit status (carrier/admin only)
     */
    canUpdateTransit: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'carrier'].includes(role));
    },

    /**
     * Check if user can confirm delivery (carrier/consignee/admin)
     */
    canConfirmDelivery: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'carrier', 'consignee'].includes(role));
    },

    /**
     * Check if user can process payment (admin/carrier/broker only)
     */
    canProcessPayment: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'carrier', 'broker'].includes(role));
    },

    /**
     * Check if user can cancel shipment (admin/shipper/carrier)
     */
    canCancel: (req) => {
      const userRoles = req.user?.roles || [];
      return userRoles.some(role => ['admin', 'shipper', 'carrier'].includes(role));
    }
  }
};

module.exports = {
  authenticate,
  requireRole,
  requireRoles: requireRole, // Alias for consistency with routes
  requirePermission,
  requirePermissionCheck,
  requireAnyPermission,
  requireAllPermissions,
  requireStatusTransition,
  requireOwnershipOrAdmin,
  optionalAuth,
  getEffectiveRole,
  permissions,
  extractToken,
  verifyToken: authenticate // Legacy alias
};