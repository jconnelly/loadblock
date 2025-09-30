/**
 * Role-Based Access Control (RBAC) Service
 * Comprehensive permission and role management system
 */

const logger = require('../utils/logger');

/**
 * Role hierarchy with permission levels
 * Higher numbers indicate higher permissions
 */
const ROLE_HIERARCHY = {
  'admin': 100,
  'carrier': 80,
  'broker': 60,
  'shipper': 40,
  'consignee': 20
};

/**
 * Permission definitions for different operations
 */
const PERMISSIONS = {
  // BoL Management Permissions
  BOL_CREATE: 'bol:create',
  BOL_READ: 'bol:read',
  BOL_UPDATE: 'bol:update',
  BOL_DELETE: 'bol:delete',
  BOL_STATUS_UPDATE: 'bol:status:update',

  // Workflow Permissions
  WORKFLOW_APPROVE: 'workflow:approve',
  WORKFLOW_ASSIGN: 'workflow:assign',
  WORKFLOW_ACCEPT: 'workflow:accept',
  WORKFLOW_PICKUP: 'workflow:pickup',
  WORKFLOW_TRANSIT: 'workflow:transit',
  WORKFLOW_DELIVER: 'workflow:deliver',
  WORKFLOW_PAYMENT: 'workflow:payment',
  WORKFLOW_CANCEL: 'workflow:cancel',

  // User Management Permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ROLE_ASSIGN: 'user:role:assign',

  // Contact Management Permissions
  CONTACT_CREATE: 'contact:create',
  CONTACT_READ: 'contact:read',
  CONTACT_UPDATE: 'contact:update',
  CONTACT_DELETE: 'contact:delete',

  // System Administration Permissions
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_REPORTS: 'admin:reports',
  ADMIN_SETTINGS: 'admin:settings',

  // Dashboard Access Permissions
  DASHBOARD_ADMIN: 'dashboard:admin',
  DASHBOARD_CARRIER: 'dashboard:carrier',
  DASHBOARD_SHIPPER: 'dashboard:shipper',
  DASHBOARD_BROKER: 'dashboard:broker',
  DASHBOARD_CONSIGNEE: 'dashboard:consignee'
};

/**
 * Role-based permission matrix
 */
const ROLE_PERMISSIONS = {
  admin: [
    // Full system access
    PERMISSIONS.BOL_CREATE,
    PERMISSIONS.BOL_READ,
    PERMISSIONS.BOL_UPDATE,
    PERMISSIONS.BOL_DELETE,
    PERMISSIONS.BOL_STATUS_UPDATE,

    // All workflow permissions
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_ASSIGN,
    PERMISSIONS.WORKFLOW_ACCEPT,
    PERMISSIONS.WORKFLOW_PICKUP,
    PERMISSIONS.WORKFLOW_TRANSIT,
    PERMISSIONS.WORKFLOW_DELIVER,
    PERMISSIONS.WORKFLOW_PAYMENT,
    PERMISSIONS.WORKFLOW_CANCEL,

    // User management
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_ROLE_ASSIGN,

    // Contact management
    PERMISSIONS.CONTACT_CREATE,
    PERMISSIONS.CONTACT_READ,
    PERMISSIONS.CONTACT_UPDATE,
    PERMISSIONS.CONTACT_DELETE,

    // System administration
    PERMISSIONS.ADMIN_SYSTEM,
    PERMISSIONS.ADMIN_AUDIT,
    PERMISSIONS.ADMIN_REPORTS,
    PERMISSIONS.ADMIN_SETTINGS,

    // All dashboards
    PERMISSIONS.DASHBOARD_ADMIN,
    PERMISSIONS.DASHBOARD_CARRIER,
    PERMISSIONS.DASHBOARD_SHIPPER,
    PERMISSIONS.DASHBOARD_BROKER,
    PERMISSIONS.DASHBOARD_CONSIGNEE
  ],

  carrier: [
    // BoL operations
    PERMISSIONS.BOL_CREATE,
    PERMISSIONS.BOL_READ,
    PERMISSIONS.BOL_UPDATE,
    PERMISSIONS.BOL_STATUS_UPDATE,

    // Carrier workflow permissions
    PERMISSIONS.WORKFLOW_ACCEPT,
    PERMISSIONS.WORKFLOW_PICKUP,
    PERMISSIONS.WORKFLOW_TRANSIT,
    PERMISSIONS.WORKFLOW_DELIVER,
    PERMISSIONS.WORKFLOW_CANCEL,

    // Contact management
    PERMISSIONS.CONTACT_CREATE,
    PERMISSIONS.CONTACT_READ,
    PERMISSIONS.CONTACT_UPDATE,

    // Dashboard access
    PERMISSIONS.DASHBOARD_CARRIER
  ],

  broker: [
    // BoL operations
    PERMISSIONS.BOL_CREATE,
    PERMISSIONS.BOL_READ,
    PERMISSIONS.BOL_UPDATE,

    // Broker workflow permissions
    PERMISSIONS.WORKFLOW_ASSIGN,
    PERMISSIONS.WORKFLOW_PAYMENT,

    // Contact management
    PERMISSIONS.CONTACT_CREATE,
    PERMISSIONS.CONTACT_READ,
    PERMISSIONS.CONTACT_UPDATE,

    // Dashboard access
    PERMISSIONS.DASHBOARD_BROKER
  ],

  shipper: [
    // BoL operations
    PERMISSIONS.BOL_CREATE,
    PERMISSIONS.BOL_READ,
    PERMISSIONS.BOL_UPDATE,

    // Shipper workflow permissions
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_CANCEL,

    // Contact management
    PERMISSIONS.CONTACT_CREATE,
    PERMISSIONS.CONTACT_READ,
    PERMISSIONS.CONTACT_UPDATE,

    // Dashboard access
    PERMISSIONS.DASHBOARD_SHIPPER
  ],

  consignee: [
    // Limited BoL operations
    PERMISSIONS.BOL_READ,

    // Consignee workflow permissions
    PERMISSIONS.WORKFLOW_DELIVER, // Can confirm delivery

    // Limited contact management
    PERMISSIONS.CONTACT_READ,

    // Dashboard access
    PERMISSIONS.DASHBOARD_CONSIGNEE
  ]
};

/**
 * Status-specific permissions for workflow management
 */
const STATUS_PERMISSIONS = {
  pending: {
    canTransitionTo: ['approved', 'cancelled'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_APPROVE, PERMISSIONS.WORKFLOW_CANCEL],
    allowedRoles: ['admin', 'shipper']
  },
  approved: {
    canTransitionTo: ['assigned', 'cancelled'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_ASSIGN, PERMISSIONS.WORKFLOW_CANCEL],
    allowedRoles: ['admin', 'broker', 'shipper']
  },
  assigned: {
    canTransitionTo: ['accepted', 'rejected', 'cancelled'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_ACCEPT, PERMISSIONS.WORKFLOW_CANCEL],
    allowedRoles: ['admin', 'carrier']
  },
  accepted: {
    canTransitionTo: ['picked_up', 'cancelled'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_PICKUP, PERMISSIONS.WORKFLOW_CANCEL],
    allowedRoles: ['admin', 'carrier']
  },
  picked_up: {
    canTransitionTo: ['en_route'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_TRANSIT],
    allowedRoles: ['admin', 'carrier']
  },
  en_route: {
    canTransitionTo: ['delivered'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_DELIVER],
    allowedRoles: ['admin', 'carrier', 'consignee']
  },
  delivered: {
    canTransitionTo: ['unpaid'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_PAYMENT],
    allowedRoles: ['admin', 'carrier', 'broker']
  },
  unpaid: {
    canTransitionTo: ['paid'],
    requiredPermissions: [PERMISSIONS.WORKFLOW_PAYMENT],
    allowedRoles: ['admin', 'carrier', 'broker']
  },
  paid: {
    canTransitionTo: [], // Terminal state
    requiredPermissions: [],
    allowedRoles: []
  },
  cancelled: {
    canTransitionTo: [], // Terminal state
    requiredPermissions: [],
    allowedRoles: []
  },
  rejected: {
    canTransitionTo: ['assigned'], // Can be reassigned
    requiredPermissions: [PERMISSIONS.WORKFLOW_ASSIGN],
    allowedRoles: ['admin', 'broker']
  }
};

class RBACService {
  /**
   * Check if user has a specific permission
   * @param {Object} user - User object with roles
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  static hasPermission(user, permission) {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false;
    }

    // Admin has all permissions
    if (user.roles.includes('admin')) {
      return true;
    }

    // Check if any of user's roles have the permission
    for (const role of user.roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      if (rolePermissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   * @param {Object} user - User object with roles
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean}
   */
  static hasAnyPermission(user, permissions) {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all of the specified permissions
   * @param {Object} user - User object with roles
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean}
   */
  static hasAllPermissions(user, permissions) {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Get user's effective role (highest in hierarchy)
   * @param {Object} user - User object with roles
   * @returns {string}
   */
  static getEffectiveRole(user) {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return 'consignee'; // Default fallback
    }

    let highestRole = 'consignee';
    let highestLevel = 0;

    for (const role of user.roles) {
      const level = ROLE_HIERARCHY[role] || 0;
      if (level > highestLevel) {
        highestLevel = level;
        highestRole = role;
      }
    }

    return highestRole;
  }

  /**
   * Get all permissions for user's roles
   * @param {Object} user - User object with roles
   * @returns {Array<string>}
   */
  static getUserPermissions(user) {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return [];
    }

    const permissions = new Set();

    for (const role of user.roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    return Array.from(permissions);
  }

  /**
   * Check if user can transition BoL status
   * @param {Object} user - User object with roles
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  static canTransitionStatus(user, fromStatus, toStatus) {
    const statusConfig = STATUS_PERMISSIONS[fromStatus];

    if (!statusConfig) {
      return { allowed: false, reason: `Invalid current status: ${fromStatus}` };
    }

    // Check if transition is valid
    if (!statusConfig.canTransitionTo.includes(toStatus)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${fromStatus} to ${toStatus}. Valid transitions: ${statusConfig.canTransitionTo.join(', ')}`
      };
    }

    // Check if user has required role
    const userRoles = user?.roles || [];
    const hasAllowedRole = statusConfig.allowedRoles.some(role => userRoles.includes(role));

    if (!hasAllowedRole) {
      return {
        allowed: false,
        reason: `User role not authorized for this transition. Required roles: ${statusConfig.allowedRoles.join(', ')}`
      };
    }

    // Check if user has required permissions
    const hasRequiredPermissions = statusConfig.requiredPermissions.every(
      permission => this.hasPermission(user, permission)
    );

    if (!hasRequiredPermissions) {
      return {
        allowed: false,
        reason: `User lacks required permissions for this transition`
      };
    }

    return { allowed: true };
  }

  /**
   * Get available status transitions for user
   * @param {Object} user - User object with roles
   * @param {string} currentStatus - Current BoL status
   * @returns {Array<string>}
   */
  static getAvailableStatusTransitions(user, currentStatus) {
    const statusConfig = STATUS_PERMISSIONS[currentStatus];

    if (!statusConfig) {
      return [];
    }

    return statusConfig.canTransitionTo.filter(toStatus => {
      const result = this.canTransitionStatus(user, currentStatus, toStatus);
      return result.allowed;
    });
  }

  /**
   * Get role hierarchy level
   * @param {string} role - Role name
   * @returns {number}
   */
  static getRoleLevel(role) {
    return ROLE_HIERARCHY[role] || 0;
  }

  /**
   * Check if one role is higher than another in hierarchy
   * @param {string} role1 - First role
   * @param {string} role2 - Second role
   * @returns {boolean}
   */
  static isRoleHigher(role1, role2) {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Get dashboard permissions for user
   * @param {Object} user - User object with roles
   * @returns {Array<string>}
   */
  static getDashboardPermissions(user) {
    const dashboardPerms = [];
    const userPermissions = this.getUserPermissions(user);

    Object.values(PERMISSIONS)
      .filter(perm => perm.startsWith('dashboard:'))
      .forEach(perm => {
        if (userPermissions.includes(perm)) {
          dashboardPerms.push(perm.replace('dashboard:', ''));
        }
      });

    return dashboardPerms;
  }

  /**
   * Validate user can access resource
   * @param {Object} user - User object
   * @param {string} resource - Resource type
   * @param {string} action - Action to perform
   * @param {Object} context - Additional context
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  static validateAccess(user, resource, action, context = {}) {
    const permission = `${resource}:${action}`;

    if (!this.hasPermission(user, permission)) {
      return {
        allowed: false,
        reason: `User lacks permission: ${permission}`
      };
    }

    // Additional context-based checks
    if (context.resourceOwnerId) {
      // Allow if user owns resource or is admin
      if (user.id !== context.resourceOwnerId && !user.roles.includes('admin')) {
        return {
          allowed: false,
          reason: `User can only access their own ${resource}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get permission definitions
   * @returns {Object}
   */
  static getPermissions() {
    return { ...PERMISSIONS };
  }

  /**
   * Get role permissions
   * @returns {Object}
   */
  static getRolePermissions() {
    return { ...ROLE_PERMISSIONS };
  }

  /**
   * Get status permissions
   * @returns {Object}
   */
  static getStatusPermissions() {
    return { ...STATUS_PERMISSIONS };
  }
}

// Export constants and service
module.exports = {
  RBACService,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STATUS_PERMISSIONS,
  ROLE_HIERARCHY
};