const express = require('express');
const { body, param, query } = require('express-validator');
const {
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireStatusTransition,
  requireOwnershipOrAdmin,
  permissions
} = require('../middleware/auth');
const { PERMISSIONS } = require('../services/rbacService');
const { asyncHandler } = require('../middleware/errorHandler');
const validationMiddleware = require('../middleware/validation');

// Import optimized services
const bolStatusService = require('../services/bolStatusService');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const pdfService = require('../services/pdfService');
const cacheService = require('../services/cacheService');
const auditTrailService = require('../services/auditTrailService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/bol
 * @desc    Get Bills of Lading with advanced filtering and caching
 * @access  Private - Requires bol:read permission
 * Target: <200ms response time
 */
router.get('/',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn([
      'pending', 'approved', 'assigned', 'accepted', 'picked_up', 'en_route', 'delivered', 'unpaid', 'paid'
    ]).withMessage('Invalid status'),
    query('shipper_id').optional().isUUID().withMessage('Invalid shipper ID'),
    query('carrier_id').optional().isUUID().withMessage('Invalid carrier ID')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();

    const {
      page = 1,
      limit = 20,
      status,
      shipper_id,
      carrier_id,
      search
    } = req.query;

    try {
      // Generate cache key based on query parameters and user role
      const cacheKey = `bol_list:${req.user.id}:${JSON.stringify({
        page, limit, status, shipper_id, carrier_id, search
      })}`;

      // Check cache first
      let result = await cacheService.get(cacheKey, { parseJson: true });

      if (!result) {
        // Mock data for demonstration - replace with actual database query
        result = {
          bols: [
            {
              id: 'bol-001',
              bolNumber: 'BOL-2024-000001',
              status: 'en_route',
              shipper: { companyName: 'ABC Shipping', contactName: 'John Doe' },
              consignee: { companyName: 'XYZ Logistics', contactName: 'Jane Smith' },
              carrier: { companyName: 'Fast Transport', contactName: 'Bob Wilson' },
              createdAt: '2024-01-15T10:30:00Z',
              updatedAt: '2024-01-15T14:20:00Z'
            }
          ],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 1,
            pages: 1
          }
        };

        // Cache result for 5 minutes
        await cacheService.set(cacheKey, result, { ttl: 300 });
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('BoL list retrieved', {
        userId: req.user.id,
        resultCount: result.bols.length,
        duration: `${duration.toFixed(2)}ms`,
        cached: result.cached || false
      });

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: `${duration.toFixed(2)}ms`
        }
      });

    } catch (error) {
      logger.error('BoL list retrieval failed', {
        userId: req.user.id,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/bol
 * @desc    Create new Bill of Lading with blockchain integration
 * @access  Private - Requires bol:create permission
 * Target: <1000ms response time
 */
router.post('/',
  requirePermission(PERMISSIONS.BOL_CREATE),
  [
    body('shipper').isObject().withMessage('Shipper information required'),
    body('consignee').isObject().withMessage('Consignee information required'),
    body('carrier').isObject().withMessage('Carrier information required'),
    body('cargoItems').isArray({ min: 1 }).withMessage('At least one cargo item required'),
    body('pickupLocation').notEmpty().withMessage('Pickup location required'),
    body('deliveryLocation').notEmpty().withMessage('Delivery location required')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();

    try {
      const bolData = {
        ...req.body,
        bolNumber: await generateBoLNumber(),
        status: 'pending',
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      };

      logger.info('Creating new BoL', {
        bolNumber: bolData.bolNumber,
        createdBy: req.user.id,
        shipperCompany: bolData.shipper.companyName,
        carrierCompany: bolData.carrier.companyName
      });

      // Create BoL in database (mock implementation)
      const bolId = `bol-${Date.now()}`;
      bolData.id = bolId;

      // Queue blockchain transaction (async)
      const blockchainResult = await blockchainService.updateBoLStatus(bolId, {
        type: 'create',
        status: 'pending',
        ...bolData
      }, { priority: 'normal' });

      // Generate initial PDF (async)
      setImmediate(async () => {
        try {
          await pdfService.generateBoLPDF(bolData);
          logger.info('Initial BoL PDF generated', { bolId });
        } catch (error) {
          logger.error('Initial PDF generation failed', { bolId, error: error.message });
        }
      });

      // Invalidate relevant caches
      await cacheService.invalidatePattern(`bol_list:*`);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('BoL created successfully', {
        bolId,
        bolNumber: bolData.bolNumber,
        duration: `${duration.toFixed(2)}ms`,
        blockchainTxId: blockchainResult.transactionId
      });

      res.status(201).json({
        success: true,
        data: {
          bol: bolData,
          blockchain: {
            transactionId: blockchainResult.transactionId,
            status: blockchainResult.status
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: `${duration.toFixed(2)}ms`
        }
      });

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.error('BoL creation failed', {
        userId: req.user.id,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/:id
 * @desc    Get specific Bill of Lading with caching
 * @access  Private - Requires bol:read permission
 * Target: <150ms response time
 */
router.get('/:id',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();
    const { id } = req.params;

    try {
      // Check cache first
      const cacheKey = `bol:${id}:details`;
      let bol = await cacheService.get(cacheKey, { parseJson: true });

      if (!bol) {
        // Mock BoL retrieval - replace with actual database query
        bol = {
          id,
          bolNumber: 'BOL-2024-000001',
          status: 'en_route',
          shipper: {
            companyName: 'ABC Shipping Inc.',
            contactName: 'John Doe',
            email: 'john.doe@abcshipping.com',
            phone: '+1-555-0123',
            address: {
              street: '123 Shipping Lane',
              city: 'Los Angeles',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          },
          consignee: {
            companyName: 'XYZ Logistics',
            contactName: 'Jane Smith',
            email: 'jane.smith@xyzlogistics.com',
            phone: '+1-555-0456'
          },
          carrier: {
            companyName: 'Fast Transport LLC',
            contactName: 'Bob Wilson',
            email: 'bob.wilson@fasttransport.com',
            phone: '+1-555-0789',
            dotNumber: 'DOT-123456',
            mcNumber: 'MC-789012'
          },
          cargoItems: [
            {
              description: 'Electronics Components',
              quantity: 100,
              unit: 'boxes',
              weight: 2500,
              value: 50000,
              packaging: 'palletized',
              freightClass: '85',
              hazmat: false,
              dimensions: '48x40x60'
            }
          ],
          statusHistory: [
            { status: 'pending', timestamp: '2024-01-15T10:30:00Z', updatedBy: 'system' },
            { status: 'approved', timestamp: '2024-01-15T11:15:00Z', updatedBy: 'shipper' },
            { status: 'assigned', timestamp: '2024-01-15T12:00:00Z', updatedBy: 'broker' },
            { status: 'accepted', timestamp: '2024-01-15T13:30:00Z', updatedBy: 'carrier' },
            { status: 'picked_up', timestamp: '2024-01-15T14:00:00Z', updatedBy: 'carrier' },
            { status: 'en_route', timestamp: '2024-01-15T14:20:00Z', updatedBy: 'carrier' }
          ],
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z'
        };

        // Cache for 10 minutes
        await cacheService.set(cacheKey, bol, { ttl: 600 });
      }

      // Check user permissions
      const hasPermission = await checkBoLPermissions(req.user, bol);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to view this BoL',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('BoL details retrieved', {
        bolId: id,
        userId: req.user.id,
        duration: `${duration.toFixed(2)}ms`,
        cached: bol.cached || false
      });

      res.json({
        success: true,
        data: { bol },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: `${duration.toFixed(2)}ms`
        }
      });

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.error('BoL details retrieval failed', {
        bolId: id,
        userId: req.user.id,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   PUT /api/v1/bol/:id/status
 * @desc    Update BoL status with enterprise-grade workflow validation
 * @access  Private - Requires bol:status:update permission and status transition validation
 * Target: <500ms response time
 */
router.put('/:id/status',
  requirePermission(PERMISSIONS.BOL_STATUS_UPDATE),
  requireStatusTransition((req) => {
    // Extract current and target status from request
    const { status: toStatus } = req.body;
    // Get current status from cache or database (simplified for this implementation)
    // In real implementation, this would fetch current BoL status
    const fromStatus = 'en_route'; // This should be fetched from the actual BoL
    return { fromStatus, toStatus };
  }),
  [
    param('id').notEmpty().withMessage('BoL ID required'),
    body('status').isIn([
      'approved', 'assigned', 'accepted', 'rejected', 'picked_up',
      'en_route', 'delivered', 'unpaid', 'paid', 'cancelled'
    ]).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('signature').optional().isString().withMessage('Signature must be a string')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();
    const { id } = req.params;
    const { status, notes = '', location, signature } = req.body;

    try {
      logger.info('Processing BoL status update', {
        bolId: id,
        newStatus: status,
        updatedBy: req.user.id,
        userRoles: req.user.roles
      });

      // Use optimized status service with enhanced validation
      const result = await bolStatusService.updateStatus(
        id,
        status,
        req.user.id,
        notes,
        { location, signature, bolData: req.body },
        req.user.roles || [],
        {
          email: req.user.email,
          roles: req.user.roles,
          request: req
        }
      );

      // Get recipient list for notifications
      const recipients = await getNotificationRecipients(id, status);

      // Send notifications (async)
      setImmediate(async () => {
        try {
          await notificationService.notifyBoLStatusChange(id, {
            bolNumber: result.data.bolNumber || id,
            previousStatus: result.data.previousStatus,
            newStatus: status,
            updatedBy: req.user.email || req.user.id,
            timestamp: result.data.updatedAt
          }, recipients);
        } catch (error) {
          logger.error('Notification sending failed', {
            bolId: id,
            error: error.message
          });
        }
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('BoL status updated successfully', {
        bolId: id,
        newStatus: status,
        updatedBy: req.user.id,
        duration: `${duration.toFixed(2)}ms`,
        target: '500ms'
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: `${duration.toFixed(2)}ms`,
          performance: result.performance
        }
      });

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.error('BoL status update failed', {
        bolId: id,
        newStatus: status,
        userId: req.user.id,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.id
      });

      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVALID_STATUS_TRANSITION'
          }
        });
      }

      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }

      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/:id/pdf
 * @desc    Generate and download BoL PDF
 * @access  Private - Requires bol:read permission
 * Target: <3000ms PDF generation
 */
router.get('/:id/pdf',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required'),
    query('regenerate').optional().isBoolean().withMessage('Regenerate must be boolean')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();
    const { id } = req.params;
    const { regenerate = false } = req.query;

    try {
      // Get BoL data
      const cacheKey = `bol:${id}:details`;
      let bol = await cacheService.get(cacheKey, { parseJson: true });

      if (!bol) {
        return res.status(404).json({
          success: false,
          error: { message: 'BoL not found', code: 'BOL_NOT_FOUND' }
        });
      }

      // Generate PDF
      const pdfResult = await pdfService.generateBoLPDF(bol, {
        forceregenerate: regenerate,
        priority: 'high'
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('BoL PDF generated for download', {
        bolId: id,
        fileSize: pdfResult.size,
        duration: `${duration.toFixed(2)}ms`,
        target: '3000ms'
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
      res.setHeader('Content-Length', pdfResult.size);

      // Stream the PDF file
      const fs = require('fs');
      const stream = fs.createReadStream(pdfResult.filepath);
      stream.pipe(res);

      // Cleanup file after streaming
      stream.on('end', async () => {
        try {
          await pdfService.deleteTemporaryFile(pdfResult.filepath);
        } catch (error) {
          logger.warn('Failed to cleanup PDF file', {
            filepath: pdfResult.filepath,
            error: error.message
          });
        }
      });

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.error('BoL PDF generation failed', {
        bolId: id,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.id
      });

      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/:id/blockchain
 * @desc    Get blockchain transaction status for BoL
 * @access  Private - Requires bol:read permission
 */
router.get('/:id/blockchain',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Get blockchain transactions for this BoL
      const transactions = await getBlockchainTransactions(id);

      res.json({
        success: true,
        data: {
          bolId: id,
          transactions,
          totalTransactions: transactions.length,
          latestStatus: transactions[0]?.status || 'unknown'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Blockchain status retrieval failed', {
        bolId: id,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/bol/batch/status
 * @desc    Batch update multiple BoL statuses
 * @access  Private - Requires bol:status:update permission
 * Target: <1000ms for 100 updates
 */
router.post('/batch/status',
  requirePermission(PERMISSIONS.BOL_STATUS_UPDATE),
  [
    body('updates').isArray({ min: 1, max: 100 }).withMessage('Updates array required (1-100 items)'),
    body('updates.*.bolId').notEmpty().withMessage('BoL ID required for each update'),
    body('updates.*.status').isIn([
      'approved', 'assigned', 'accepted', 'rejected', 'picked_up',
      'en_route', 'delivered', 'unpaid', 'paid', 'cancelled'
    ]).withMessage('Valid status required for each update')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();
    const { updates } = req.body;

    try {
      logger.info('Processing batch status updates', {
        updateCount: updates.length,
        userId: req.user.id
      });

      // Use optimized batch processing
      const results = await bolStatusService.batchUpdateStatus(
        updates.map(update => ({
          ...update,
          userId: req.user.id
        }))
      );

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      logger.info('Batch status updates completed', {
        updateCount: updates.length,
        successCount,
        errorCount,
        duration: `${duration.toFixed(2)}ms`,
        target: '1000ms'
      });

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: updates.length,
            successful: successCount,
            failed: errorCount
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: `${duration.toFixed(2)}ms`
        }
      });

    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.error('Batch status update failed', {
        updateCount: updates.length,
        userId: req.user.id,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        requestId: req.id
      });

      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/workflow/summary
 * @desc    Get complete workflow status definitions and rules
 * @access  Private - Requires bol:read permission
 */
router.get('/workflow/summary',
  requirePermission(PERMISSIONS.BOL_READ),
  asyncHandler(async (req, res) => {
    try {
      const workflowSummary = bolStatusService.getWorkflowSummary();

      res.json({
        success: true,
        data: {
          workflow: workflowSummary,
          totalStates: workflowSummary.length,
          terminalStates: workflowSummary.filter(s => s.isTerminal).length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Workflow summary retrieval failed', {
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/:id/workflow/next-statuses
 * @desc    Get valid next statuses for current BoL based on user roles
 * @access  Private - Requires bol:read permission
 */
router.get('/:id/workflow/next-statuses',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Get current BoL status
      const cacheKey = `bol:${id}:details`;
      let bol = await cacheService.get(cacheKey, { parseJson: true });

      if (!bol) {
        return res.status(404).json({
          success: false,
          error: { message: 'BoL not found', code: 'BOL_NOT_FOUND' }
        });
      }

      const validNextStatuses = bolStatusService.getValidNextStatuses(
        bol.status,
        req.user.roles || []
      );

      const nextStatusDetails = validNextStatuses.map(status => {
        const workflow = bolStatusService.getWorkflowInfo(status);
        return {
          status,
          description: workflow.description,
          requiresSignature: workflow.requiresSignature,
          requiredFields: workflow.requiredFields
        };
      });

      res.json({
        success: true,
        data: {
          currentStatus: bol.status,
          validNextStatuses: nextStatusDetails,
          userRoles: req.user.roles
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Next statuses retrieval failed', {
        bolId: id,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/bol/:id/workflow/validate
 * @desc    Validate status transition without executing it
 * @access  Private - Requires bol:read permission
 */
router.post('/:id/workflow/validate',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required'),
    body('newStatus').notEmpty().withMessage('New status required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newStatus, metadata = {} } = req.body;

    try {
      // Get current BoL status
      const cacheKey = `bol:${id}:details`;
      let bol = await cacheService.get(cacheKey, { parseJson: true });

      if (!bol) {
        return res.status(404).json({
          success: false,
          error: { message: 'BoL not found', code: 'BOL_NOT_FOUND' }
        });
      }

      // Validate transition
      const validationResult = bolStatusService.validateStatusTransition(
        bol.status,
        newStatus,
        metadata
      );

      // Check permissions
      const hasPermission = await bolStatusService.checkUserPermission(
        id,
        req.user.id,
        newStatus,
        req.user.roles || []
      );

      res.json({
        success: true,
        data: {
          valid: validationResult.valid && hasPermission,
          transition: {
            from: bol.status,
            to: newStatus,
            allowed: validationResult.valid,
            reason: validationResult.reason || 'Valid transition'
          },
          permission: {
            granted: hasPermission,
            userRoles: req.user.roles,
            requiredRoles: bolStatusService.getWorkflowInfo(newStatus)?.roles || []
          },
          requirements: bolStatusService.getWorkflowInfo(newStatus)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Status validation failed', {
        bolId: id,
        newStatus,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/:id/audit-trail
 * @desc    Get comprehensive audit trail for specific BoL
 * @access  Private - Requires bol:read permission
 */
router.get('/:id/audit-trail',
  requirePermission(PERMISSIONS.BOL_READ),
  [
    param('id').notEmpty().withMessage('BoL ID required'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    try {
      // Check if user has access to this BoL
      const cacheKey = `bol:${id}:details`;
      let bol = await cacheService.get(cacheKey, { parseJson: true });

      if (!bol) {
        return res.status(404).json({
          success: false,
          error: { message: 'BoL not found', code: 'BOL_NOT_FOUND' }
        });
      }

      const hasPermission = await checkBoLPermissions(req.user, bol);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to view audit trail',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }

      // Get audit trail
      const auditHistory = await auditTrailService.getAuditHistory('bol', id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: auditHistory,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Audit trail retrieval failed', {
        bolId: id,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/audit/statistics
 * @desc    Get audit statistics for monitoring
 * @access  Private - Requires admin:audit permission
 */
router.get('/audit/statistics',
  requirePermission(PERMISSIONS.ADMIN_AUDIT),
  [
    query('timeRange').optional().isInt({ min: 1, max: 168 }).withMessage('Time range must be 1-168 hours')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { timeRange = 24 } = req.query;

    try {
      const statistics = await auditTrailService.getAuditStatistics(parseInt(timeRange));

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Audit statistics retrieval failed', {
        timeRange,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/bol/audit/search
 * @desc    Search audit trail with filters
 * @access  Private - Requires admin:audit permission
 */
router.post('/audit/search',
  requirePermission(PERMISSIONS.ADMIN_AUDIT),
  [
    body('searchTerm').notEmpty().withMessage('Search term required'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('filters.eventType').optional().isString().withMessage('Event type must be string'),
    body('filters.severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('filters.startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    body('filters.endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { searchTerm, filters = {} } = req.body;

    try {
      const searchResults = await auditTrailService.searchAuditTrail(searchTerm, filters);

      res.json({
        success: true,
        data: searchResults,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Audit trail search failed', {
        searchTerm,
        filters,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/audit/compliance-report
 * @desc    Generate compliance report for audit purposes
 * @access  Private - Requires admin:audit permission
 */
router.get('/audit/compliance-report',
  requirePermission(PERMISSIONS.ADMIN_AUDIT),
  [
    query('startDate').notEmpty().isISO8601().withMessage('Start date required and must be valid ISO date'),
    query('endDate').notEmpty().isISO8601().withMessage('End date required and must be valid ISO date'),
    query('entityId').optional().isString().withMessage('Entity ID must be string')
  ],
  validationMiddleware.handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, entityId } = req.query;

    try {
      const complianceReport = await auditTrailService.generateComplianceReport(
        startDate,
        endDate,
        entityId || null
      );

      // Log compliance report generation for audit
      await auditTrailService.logEvent({
        eventType: 'compliance.report_generated',
        entityType: 'system',
        entityId: 'compliance_reporting',
        user: req.user,
        action: 'generate_compliance_report',
        description: `Compliance report generated for period ${startDate} to ${endDate}`,
        metadata: {
          startDate,
          endDate,
          entityFilter: entityId,
          reportSize: complianceReport.totalEvents
        },
        request: req,
        complianceCategory: 'audit_reporting'
      });

      res.json({
        success: true,
        data: complianceReport,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Compliance report generation failed', {
        startDate,
        endDate,
        entityId,
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/bol/performance/metrics
 * @desc    Get performance metrics for BoL operations
 * @access  Private - Requires admin:system permission
 */
router.get('/performance/metrics',
  requirePermission(PERMISSIONS.ADMIN_SYSTEM),
  asyncHandler(async (req, res) => {
    try {
      const metrics = {
        statusService: bolStatusService.getPerformanceMetrics(),
        blockchain: blockchainService.getPerformanceMetrics(),
        notifications: notificationService.getPerformanceMetrics(),
        pdf: pdfService.getPerformanceMetrics(),
        cache: cacheService.getMetrics(),
        auditTrail: auditTrailService.getPerformanceMetrics()
      };

      res.json({
        success: true,
        data: { metrics },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Performance metrics retrieval failed', {
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * UTILITY FUNCTIONS
 */

/**
 * Generate unique BoL number
 */
async function generateBoLNumber() {
  const year = new Date().getFullYear();
  const sequence = await getNextSequenceNumber();
  return `BOL-${year}-${sequence.toString().padStart(6, '0')}`;
}

async function getNextSequenceNumber() {
  // Mock implementation - replace with actual sequence logic
  return Math.floor(Math.random() * 999999) + 1;
}

/**
 * Check user permissions for BoL access
 */
async function checkBoLPermissions(user, bol) {
  // Admin has access to everything
  if (user.roles.includes('admin')) {
    return true;
  }

  // Check role-based access
  if (user.roles.includes('carrier') && bol.carrier?.userId === user.id) {
    return true;
  }

  if (user.roles.includes('shipper') && bol.shipper?.userId === user.id) {
    return true;
  }

  if (user.roles.includes('consignee') && bol.consignee?.userId === user.id) {
    return true;
  }

  if (user.roles.includes('broker') && bol.broker?.userId === user.id) {
    return true;
  }

  return false;
}

/**
 * Get notification recipients for status changes
 */
async function getNotificationRecipients(bolId, status) {
  // Mock implementation - replace with actual database query
  return [
    {
      userId: 'user-1',
      email: 'shipper@example.com',
      phone: '+1-555-0123',
      pushToken: 'push-token-1',
      preferences: { email: true, sms: true, push: true }
    },
    {
      userId: 'user-2',
      email: 'carrier@example.com',
      phone: '+1-555-0456',
      pushToken: 'push-token-2',
      preferences: { email: true, sms: false, push: true }
    },
    {
      userId: 'user-3',
      email: 'consignee@example.com',
      phone: '+1-555-0789',
      pushToken: 'push-token-3',
      preferences: { email: true, sms: true, push: false }
    }
  ];
}

/**
 * Get blockchain transactions for a BoL
 */
async function getBlockchainTransactions(bolId) {
  // Mock implementation - replace with actual blockchain query
  return [
    {
      id: 'tx-001',
      bolId,
      type: 'status_update',
      status: 'committed',
      txHash: '0x1234567890abcdef',
      blockNumber: 12345,
      timestamp: '2024-01-15T14:20:00Z'
    },
    {
      id: 'tx-002',
      bolId,
      type: 'create',
      status: 'committed',
      txHash: '0xabcdef1234567890',
      blockNumber: 12344,
      timestamp: '2024-01-15T10:30:00Z'
    }
  ];
}

module.exports = router;