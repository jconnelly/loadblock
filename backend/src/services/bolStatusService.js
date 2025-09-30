'use strict';

const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const auditTrailService = require('./auditTrailService');

// Mock Redis client for development (replace with actual Redis in production)
const mockRedisClient = {
    get: async (key) => null,
    set: async (key, value) => 'OK',
    setex: async (key, ttl, value) => 'OK',
    del: async (key) => 1,
    lpush: async (key, value) => 1,
    llen: async (key) => 0,
    publish: async (channel, message) => 1,
    ping: async () => 'PONG'
};

/**
 * Enterprise-grade BoL Status Management Service
 * Optimized for high-frequency status transitions with sub-500ms response times
 */
class BoLStatusService {
    constructor() {
        // Complete 9-stage status workflow with enhanced business rules
        this.statusWorkflow = {
            'pending': {
                next: ['approved', 'cancelled'],
                roles: ['shipper', 'admin'],
                description: 'Initial state - awaiting shipper approval',
                requiresSignature: false,
                requiredFields: ['shipper', 'consignee', 'cargoItems']
            },
            'approved': {
                next: ['assigned', 'cancelled'],
                roles: ['shipper', 'broker', 'admin'],
                description: 'Shipper approved - ready for carrier assignment',
                requiresSignature: true,
                requiredFields: ['approvedBy', 'approvalTimestamp']
            },
            'assigned': {
                next: ['accepted', 'rejected', 'cancelled'],
                roles: ['broker', 'admin'],
                description: 'Assigned to carrier - awaiting carrier acceptance',
                requiresSignature: false,
                requiredFields: ['carrier', 'assignedBy']
            },
            'accepted': {
                next: ['picked_up', 'cancelled'],
                roles: ['carrier', 'admin'],
                description: 'Carrier accepted assignment - ready for pickup',
                requiresSignature: true,
                requiredFields: ['acceptedBy', 'acceptanceTimestamp']
            },
            'picked_up': {
                next: ['en_route', 'cancelled'],
                roles: ['carrier', 'admin'],
                description: 'Cargo picked up - in carrier possession',
                requiresSignature: true,
                requiredFields: ['pickupLocation', 'pickupTimestamp', 'pickupSignature']
            },
            'en_route': {
                next: ['delivered', 'cancelled'],
                roles: ['carrier', 'admin'],
                description: 'In transit to destination',
                requiresSignature: false,
                requiredFields: ['estimatedDelivery']
            },
            'delivered': {
                next: ['unpaid'],
                roles: ['carrier', 'consignee', 'admin'],
                description: 'Delivered to consignee - awaiting payment processing',
                requiresSignature: true,
                requiredFields: ['deliveryLocation', 'deliveryTimestamp', 'consigneeSignature']
            },
            'unpaid': {
                next: ['paid'],
                roles: ['admin', 'carrier', 'broker'],
                description: 'Delivery confirmed - payment pending',
                requiresSignature: false,
                requiredFields: ['invoiceNumber', 'paymentTerms']
            },
            'paid': {
                next: [],
                roles: [],
                description: 'Payment completed - shipment closed',
                requiresSignature: false,
                requiredFields: ['paymentDate', 'paymentReference'],
                terminal: true
            },
            // Additional statuses for workflow control
            'cancelled': {
                next: [],
                roles: ['admin', 'shipper', 'carrier'],
                description: 'Shipment cancelled',
                requiresSignature: true,
                requiredFields: ['cancellationReason', 'cancelledBy'],
                terminal: true
            },
            'rejected': {
                next: ['assigned', 'cancelled'],
                roles: ['carrier'],
                description: 'Carrier rejected assignment',
                requiresSignature: false,
                requiredFields: ['rejectionReason', 'rejectedBy']
            }
        };

        // Redis client for high-performance caching (mock for development)
        this.redis = mockRedisClient;

        // Connection pool optimization
        this.connectionPool = {
            max: 50, // Increased for high concurrency
            acquireTimeoutMillis: 1000,
            createTimeoutMillis: 2000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
        };

        // Prepared statement cache for performance
        this.preparedQueries = new Map();
        this.initializePreparedStatements();
    }

    /**
     * Initialize prepared statements for optimal query performance
     */
    initializePreparedStatements() {
        this.preparedQueries.set('updateStatus', `
            UPDATE bills_of_lading
            SET status = $1,
                status_updated_at = CURRENT_TIMESTAMP,
                status_updated_by = $2,
                version = version + 1
            WHERE id = $3 AND version = $4
            RETURNING id, status, version, status_updated_at
        `);

        this.preparedQueries.set('insertStatusHistory', `
            INSERT INTO bol_status_history
            (bol_id, previous_status, new_status, updated_by, updated_at, notes, transaction_metadata)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
            RETURNING id
        `);

        this.preparedQueries.set('getBoLWithLock', `
            SELECT id, status, version, shipper_id, carrier_id, consignee_id
            FROM bills_of_lading
            WHERE id = $1
            FOR UPDATE NOWAIT
        `);

        this.preparedQueries.set('validateUserPermission', `
            SELECT COUNT(*) as count
            FROM bol_permissions bp
            JOIN users u ON bp.user_id = u.id
            WHERE bp.bol_id = $1 AND u.id = $2 AND $3 = ANY(u.roles)
        `);
    }

    /**
     * High-performance status update with optimistic locking and enhanced validation
     * Target: <200ms response time
     */
    async updateStatus(bolId, newStatus, userId, notes = '', metadata = {}, userRoles = [], userContext = {}) {
        const startTime = process.hrtime.bigint();

        try {
            // 1. Cache-first validation (50ms target)
            const cacheKey = `bol:${bolId}:status`;
            let cachedData = await this.redis.get(cacheKey);

            if (!cachedData) {
                // Cache miss - fetch from DB and cache
                const result = await query(
                    'SELECT id, status, version FROM bills_of_lading WHERE id = $1',
                    [bolId]
                );

                if (result.rows.length === 0) {
                    throw new Error('BoL not found');
                }

                cachedData = JSON.stringify(result.rows[0]);
                await this.redis.setex(cacheKey, 300, cachedData); // 5-minute cache
            }

            const currentBol = JSON.parse(cachedData);

            // 2. Comprehensive status transition validation (10ms target)
            const validationResult = this.validateStatusTransition(
                currentBol.status,
                newStatus,
                metadata
            );

            if (!validationResult.valid) {
                throw new Error(validationResult.reason);
            }

            // 3. Enhanced role-based permission check with cache (20ms target)
            const hasPermission = await this.checkUserPermission(bolId, userId, newStatus, userRoles);
            if (!hasPermission) {
                throw new Error(`Insufficient permissions for status update. Required roles: ${this.statusWorkflow[newStatus]?.roles.join(', ') || 'admin'}`);
            }

            // 4. Atomic status update with optimistic locking (100ms target)
            const result = await transaction(async (client) => {
                // Update main record with version check
                const updateResult = await client.query(
                    this.preparedQueries.get('updateStatus'),
                    [newStatus, userId, bolId, currentBol.version]
                );

                if (updateResult.rows.length === 0) {
                    throw new Error('BoL was modified by another process. Please retry.');
                }

                // Insert status history record
                await client.query(
                    this.preparedQueries.get('insertStatusHistory'),
                    [bolId, currentBol.status, newStatus, userId, notes, JSON.stringify(metadata)]
                );

                return updateResult.rows[0];
            });

            // 5. Update cache asynchronously (non-blocking)
            setImmediate(() => {
                this.updateCacheAsync(bolId, result);
            });

            // 6. Trigger async operations (non-blocking)
            setImmediate(() => {
                this.triggerAsyncOperations(bolId, currentBol.status, newStatus, userId, metadata, userContext);
            });

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            logger.info('Status updated successfully', {
                bolId,
                previousStatus: currentBol.status,
                newStatus,
                userId,
                duration: `${duration.toFixed(2)}ms`,
                version: result.version
            });

            return {
                success: true,
                data: {
                    bolId,
                    status: result.status,
                    version: result.version,
                    updatedAt: result.status_updated_at
                },
                performance: {
                    responseTime: `${duration.toFixed(2)}ms`,
                    target: '200ms'
                }
            };

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            logger.error('Status update failed', {
                bolId,
                newStatus,
                userId,
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });

            throw error;
        }
    }

    /**
     * Comprehensive status transition validation with business rules
     * Target: <10ms
     */
    validateStatusTransition(currentStatus, newStatus, metadata = {}) {
        const currentWorkflow = this.statusWorkflow[currentStatus];
        const newWorkflow = this.statusWorkflow[newStatus];

        if (!currentWorkflow || !newWorkflow) {
            return {
                valid: false,
                reason: `Invalid status: ${currentStatus} or ${newStatus}`
            };
        }

        // Check if transition is allowed
        if (!currentWorkflow.next.includes(newStatus)) {
            return {
                valid: false,
                reason: `Invalid transition from ${currentStatus} to ${newStatus}. Allowed: ${currentWorkflow.next.join(', ')}`
            };
        }

        // Validate required fields for new status
        const missingFields = this.validateRequiredFields(newStatus, metadata);
        if (missingFields.length > 0) {
            return {
                valid: false,
                reason: `Missing required fields for ${newStatus}: ${missingFields.join(', ')}`
            };
        }

        // Validate signature requirement
        if (newWorkflow.requiresSignature && !metadata.signature) {
            return {
                valid: false,
                reason: `Digital signature required for ${newStatus} status`
            };
        }

        return { valid: true };
    }

    /**
     * Validate required fields for status transition
     */
    validateRequiredFields(status, metadata) {
        const workflow = this.statusWorkflow[status];
        if (!workflow || !workflow.requiredFields) {
            return [];
        }

        const missingFields = [];
        for (const field of workflow.requiredFields) {
            if (!metadata[field] && !metadata.bolData?.[field]) {
                missingFields.push(field);
            }
        }

        return missingFields;
    }

    /**
     * Get workflow information for status
     */
    getWorkflowInfo(status) {
        return this.statusWorkflow[status] || null;
    }

    /**
     * Get all valid next statuses for current status
     */
    getValidNextStatuses(currentStatus, userRoles = []) {
        const workflow = this.statusWorkflow[currentStatus];
        if (!workflow) return [];

        return workflow.next.filter(nextStatus => {
            const nextWorkflow = this.statusWorkflow[nextStatus];
            if (!nextWorkflow) return false;

            // Check if user has required role for transition
            return nextWorkflow.roles.length === 0 ||
                   nextWorkflow.roles.some(role => userRoles.includes(role)) ||
                   userRoles.includes('admin');
        });
    }

    /**
     * Enhanced role-based permission checking with workflow validation
     * Target: <20ms
     */
    async checkUserPermission(bolId, userId, status, userRoles = []) {
        const cacheKey = `permission:${bolId}:${userId}:${status}`;

        let hasPermission = await this.redis.get(cacheKey);
        if (hasPermission !== null) {
            return hasPermission === 'true';
        }

        // Get workflow requirements for the status
        const workflow = this.statusWorkflow[status];
        if (!workflow) {
            return false;
        }

        // Admin always has permission
        if (userRoles.includes('admin')) {
            hasPermission = true;
        } else {
            // Check if user has any of the required roles for this status
            hasPermission = workflow.roles.length === 0 ||
                           workflow.roles.some(role => userRoles.includes(role));
        }

        // Additional database check for BoL-specific permissions
        if (hasPermission) {
            try {
                const result = await query(
                    this.preparedQueries.get('validateUserPermission'),
                    [bolId, userId, workflow.roles[0] || 'admin']
                );
                hasPermission = result.rows[0].count > 0;
            } catch (error) {
                logger.warn('Database permission check failed, using role-based check', {
                    bolId, userId, error: error.message
                });
            }
        }

        // Cache for 60 seconds
        await this.redis.setex(cacheKey, 60, hasPermission.toString());

        return hasPermission;
    }

    /**
     * Get comprehensive status workflow summary
     */
    getWorkflowSummary() {
        return Object.keys(this.statusWorkflow).map(status => ({
            status,
            description: this.statusWorkflow[status].description,
            nextStates: this.statusWorkflow[status].next,
            requiredRoles: this.statusWorkflow[status].roles,
            requiresSignature: this.statusWorkflow[status].requiresSignature,
            requiredFields: this.statusWorkflow[status].requiredFields,
            isTerminal: this.statusWorkflow[status].terminal || false
        }));
    }

    /**
     * Asynchronous cache update (non-blocking)
     */
    async updateCacheAsync(bolId, updatedData) {
        try {
            const cacheKey = `bol:${bolId}:status`;
            await this.redis.setex(cacheKey, 300, JSON.stringify(updatedData));

            // Update related caches
            await this.redis.del(`bol:${bolId}:history`);
            await this.redis.del(`bol:${bolId}:permissions:*`);

        } catch (error) {
            logger.warn('Cache update failed', { bolId, error: error.message });
        }
    }

    /**
     * Trigger async operations without blocking main response
     */
    async triggerAsyncOperations(bolId, previousStatus, newStatus, userId, metadata, userContext = {}) {
        try {
            // These operations run asynchronously to maintain sub-500ms response times

            // 1. Audit trail logging (immediate - critical for compliance)
            await this.logAuditEvent(bolId, previousStatus, newStatus, userId, metadata, userContext);

            // 2. Blockchain transaction (queued)
            await this.queueBlockchainTransaction(bolId, newStatus, metadata);

            // 3. PDF regeneration (queued)
            await this.queuePDFRegeneration(bolId, newStatus);

            // 4. Notifications (immediate)
            await this.sendStatusNotifications(bolId, previousStatus, newStatus, userId);

            // 5. Analytics update (queued)
            await this.updateAnalytics(bolId, newStatus);

        } catch (error) {
            logger.error('Async operations failed', {
                bolId,
                newStatus,
                error: error.message
            });
        }
    }

    /**
     * Log comprehensive audit event for status change
     */
    async logAuditEvent(bolId, previousStatus, newStatus, userId, metadata, userContext) {
        try {
            const auditData = {
                eventType: 'bol.status_changed',
                entityType: 'bol',
                entityId: bolId,
                user: {
                    id: userId,
                    email: userContext.email,
                    roles: userContext.roles
                },
                action: `status_change_${previousStatus}_to_${newStatus}`,
                description: `BoL status changed from ${previousStatus} to ${newStatus}`,
                oldValues: {
                    status: previousStatus,
                    timestamp: new Date().toISOString()
                },
                newValues: {
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                    updatedBy: userId
                },
                metadata: {
                    ...metadata,
                    transitionType: this.statusWorkflow[previousStatus]?.description || 'unknown',
                    requiresSignature: this.statusWorkflow[newStatus]?.requiresSignature || false,
                    workflowStep: this.getWorkflowStep(newStatus)
                },
                request: userContext.request || {},
                complianceCategory: this.getComplianceCategory(newStatus)
            };

            await auditTrailService.logEvent(auditData);

            logger.debug('Audit event logged for status change', {
                bolId,
                previousStatus,
                newStatus,
                userId
            });

        } catch (error) {
            logger.error('Failed to log audit event', {
                bolId,
                previousStatus,
                newStatus,
                error: error.message
            });
            // Don't throw - audit logging failure shouldn't break status update
        }
    }

    /**
     * Get workflow step number for audit tracking
     */
    getWorkflowStep(status) {
        const workflowOrder = [
            'pending', 'approved', 'assigned', 'accepted',
            'picked_up', 'en_route', 'delivered', 'unpaid', 'paid'
        ];

        return workflowOrder.indexOf(status) + 1;
    }

    /**
     * Get compliance category for audit classification
     */
    getComplianceCategory(status) {
        const complianceMap = {
            'approved': 'shipper_approval',
            'accepted': 'carrier_commitment',
            'picked_up': 'cargo_custody',
            'delivered': 'delivery_confirmation',
            'paid': 'financial_settlement'
        };

        return complianceMap[status] || null;
    }

    /**
     * Queue blockchain transaction for processing
     */
    async queueBlockchainTransaction(bolId, status, metadata) {
        const job = {
            type: 'blockchain_update',
            bolId,
            status,
            metadata,
            timestamp: Date.now(),
            priority: this.getBlockchainPriority(status)
        };

        await this.redis.lpush('blockchain_queue', JSON.stringify(job));

        logger.debug('Blockchain transaction queued', { bolId, status });
    }

    /**
     * Queue PDF regeneration
     */
    async queuePDFRegeneration(bolId, status) {
        const job = {
            type: 'pdf_generation',
            bolId,
            status,
            timestamp: Date.now(),
            priority: this.getPDFPriority(status)
        };

        await this.redis.lpush('pdf_queue', JSON.stringify(job));

        logger.debug('PDF regeneration queued', { bolId, status });
    }

    /**
     * Immediate notification sending
     */
    async sendStatusNotifications(bolId, previousStatus, newStatus, userId) {
        // Fast notification without blocking
        const notification = {
            type: 'status_change',
            bolId,
            previousStatus,
            newStatus,
            updatedBy: userId,
            timestamp: Date.now()
        };

        await this.redis.publish('notifications', JSON.stringify(notification));

        logger.debug('Notification sent', { bolId, newStatus });
    }

    /**
     * Batch status updates for multiple BoLs
     * Target: <1000ms for 100 updates
     */
    async batchUpdateStatus(updates) {
        const startTime = process.hrtime.bigint();
        const results = [];
        const batchSize = 50; // Process in batches

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const batchPromises = batch.map(update =>
                this.updateStatus(update.bolId, update.status, update.userId, update.notes)
                    .catch(error => ({ error: error.message, bolId: update.bolId }))
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        logger.info('Batch status update completed', {
            totalUpdates: updates.length,
            successCount: results.filter(r => !r.error).length,
            errorCount: results.filter(r => r.error).length,
            duration: `${duration.toFixed(2)}ms`
        });

        return results;
    }

    /**
     * Get priority for blockchain operations
     */
    getBlockchainPriority(status) {
        const highPriority = ['delivered', 'paid'];
        return highPriority.includes(status) ? 1 : 2;
    }

    /**
     * Get priority for PDF operations
     */
    getPDFPriority(status) {
        const highPriority = ['approved', 'delivered'];
        return highPriority.includes(status) ? 1 : 2;
    }

    /**
     * Performance monitoring and metrics
     */
    async getPerformanceMetrics() {
        const metrics = {
            cache_hit_ratio: await this.getCacheHitRatio(),
            avg_response_time: await this.getAverageResponseTime(),
            queue_depths: {
                blockchain: await this.redis.llen('blockchain_queue'),
                pdf: await this.redis.llen('pdf_queue')
            },
            active_connections: await this.getActiveConnections()
        };

        return metrics;
    }

    /**
     * Health check for the service
     */
    async healthCheck() {
        try {
            // Test database connection
            await query('SELECT 1');

            // Test Redis connection
            await this.redis.ping();

            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = new BoLStatusService();