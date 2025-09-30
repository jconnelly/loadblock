'use strict';

const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

/**
 * Comprehensive Audit Trail Service for LoadBlock
 * Provides immutable audit logging, compliance tracking, and forensic analysis
 * Target: Complete audit trail coverage for all critical operations
 */
class AuditTrailService {
    constructor() {
        // Audit event types with criticality levels
        this.eventTypes = {
            // BoL Lifecycle Events
            'bol.created': { level: 'high', retention: 2555 }, // 7 years
            'bol.status_changed': { level: 'high', retention: 2555 },
            'bol.modified': { level: 'medium', retention: 1825 }, // 5 years
            'bol.deleted': { level: 'critical', retention: 3650 }, // 10 years

            // User Actions
            'user.login': { level: 'medium', retention: 365 }, // 1 year
            'user.logout': { level: 'low', retention: 90 },
            'user.failed_login': { level: 'high', retention: 365 },
            'user.password_changed': { level: 'high', retention: 1825 },
            'user.role_changed': { level: 'critical', retention: 2555 },

            // System Events
            'system.blockchain_sync': { level: 'medium', retention: 365 },
            'system.backup': { level: 'medium', retention: 365 },
            'system.maintenance': { level: 'medium', retention: 365 },

            // Security Events
            'security.unauthorized_access': { level: 'critical', retention: 2555 },
            'security.data_export': { level: 'high', retention: 1825 },
            'security.config_change': { level: 'critical', retention: 2555 },

            // Compliance Events
            'compliance.pdf_generated': { level: 'high', retention: 2555 },
            'compliance.signature_applied': { level: 'critical', retention: 2555 },
            'compliance.document_access': { level: 'medium', retention: 1825 }
        };

        // Performance metrics
        this.metrics = {
            totalEvents: 0,
            eventsToday: 0,
            criticalEvents: 0,
            avgLogTime: 0,
            failedLogs: 0
        };

        this.initializeQueries();
    }

    /**
     * Initialize prepared queries for performance
     */
    initializeQueries() {
        this.queries = {
            insertAuditEvent: `
                INSERT INTO audit_trail (
                    event_type, entity_type, entity_id, user_id, user_email, user_roles,
                    action, description, old_values, new_values, metadata,
                    ip_address, user_agent, session_id, request_id,
                    timestamp, severity, compliance_category
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    CURRENT_TIMESTAMP, $16, $17
                ) RETURNING id, timestamp
            `,

            getAuditHistory: `
                SELECT
                    id, event_type, entity_type, entity_id, user_email, action,
                    description, old_values, new_values, metadata,
                    ip_address, timestamp, severity, compliance_category
                FROM audit_trail
                WHERE entity_type = $1 AND entity_id = $2
                ORDER BY timestamp DESC
                LIMIT $3 OFFSET $4
            `,

            getAuditStats: `
                SELECT
                    event_type,
                    COUNT(*) as count,
                    MAX(timestamp) as last_occurrence,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
                FROM audit_trail
                WHERE timestamp >= $1
                GROUP BY event_type
                ORDER BY count DESC
            `,

            getComplianceReport: `
                SELECT
                    entity_id,
                    event_type,
                    user_email,
                    timestamp,
                    description,
                    compliance_category
                FROM audit_trail
                WHERE compliance_category IS NOT NULL
                    AND timestamp BETWEEN $1 AND $2
                    AND ($3 IS NULL OR entity_id = $3)
                ORDER BY timestamp DESC
            `,

            searchAuditTrail: `
                SELECT
                    id, event_type, entity_type, entity_id, user_email, action,
                    description, timestamp, severity
                FROM audit_trail
                WHERE (
                    LOWER(description) LIKE LOWER($1) OR
                    LOWER(user_email) LIKE LOWER($1) OR
                    LOWER(action) LIKE LOWER($1)
                )
                    AND ($2 IS NULL OR event_type = $2)
                    AND ($3 IS NULL OR severity = $3)
                    AND timestamp BETWEEN $4 AND $5
                ORDER BY timestamp DESC
                LIMIT $6 OFFSET $7
            `
        };
    }

    /**
     * Log audit event with comprehensive metadata
     * Target: <50ms logging time
     */
    async logEvent(eventData) {
        const startTime = process.hrtime.bigint();

        try {
            const {
                eventType,
                entityType,
                entityId,
                user,
                action,
                description,
                oldValues = null,
                newValues = null,
                metadata = {},
                request = {},
                complianceCategory = null
            } = eventData;

            // Validate event type
            const eventConfig = this.eventTypes[eventType];
            if (!eventConfig) {
                logger.warn('Unknown audit event type', { eventType });
            }

            // Determine severity
            const severity = this.determineSeverity(eventType, action, oldValues, newValues);

            // Extract request metadata
            const ipAddress = request.ip || request.connection?.remoteAddress || 'unknown';
            const userAgent = request.get?.('User-Agent') || 'unknown';
            const sessionId = request.sessionId || request.id || null;
            const requestId = request.id || null;

            // Prepare audit record
            const auditRecord = [
                eventType,
                entityType,
                entityId,
                user?.id || null,
                user?.email || 'system',
                user?.roles ? JSON.stringify(user.roles) : null,
                action,
                description,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                JSON.stringify({
                    ...metadata,
                    retentionDays: eventConfig?.retention || 365,
                    loggedAt: new Date().toISOString()
                }),
                ipAddress,
                userAgent,
                sessionId,
                requestId,
                severity,
                complianceCategory
            ];

            // Insert audit record
            const result = await query(this.queries.insertAuditEvent, auditRecord);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            // Update metrics
            this.updateMetrics(eventType, severity, duration);

            // Cache recent audit events for performance
            await this.cacheRecentEvent(entityType, entityId, result.rows[0]);

            logger.debug('Audit event logged', {
                auditId: result.rows[0].id,
                eventType,
                entityType,
                entityId,
                user: user?.email || 'system',
                duration: `${duration.toFixed(2)}ms`
            });

            return {
                success: true,
                auditId: result.rows[0].id,
                timestamp: result.rows[0].timestamp,
                logTime: `${duration.toFixed(2)}ms`
            };

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            this.metrics.failedLogs++;

            logger.error('Audit logging failed', {
                eventType: eventData.eventType,
                entityType: eventData.entityType,
                entityId: eventData.entityId,
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });

            throw error;
        }
    }

    /**
     * Get comprehensive audit history for an entity
     */
    async getAuditHistory(entityType, entityId, options = {}) {
        try {
            const limit = Math.min(options.limit || 50, 500); // Max 500 records
            const offset = options.offset || 0;

            // Check cache first for recent events
            const cacheKey = `audit:${entityType}:${entityId}`;
            let cachedEvents = await cacheService.get(cacheKey, { parseJson: true });

            // Get from database
            const result = await query(this.queries.getAuditHistory, [
                entityType,
                entityId,
                limit,
                offset
            ]);

            const auditEvents = result.rows.map(row => ({
                id: row.id,
                eventType: row.event_type,
                entityType: row.entity_type,
                entityId: row.entity_id,
                userEmail: row.user_email,
                action: row.action,
                description: row.description,
                oldValues: row.old_values ? JSON.parse(row.old_values) : null,
                newValues: row.new_values ? JSON.parse(row.new_values) : null,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                ipAddress: row.ip_address,
                timestamp: row.timestamp,
                severity: row.severity,
                complianceCategory: row.compliance_category
            }));

            return {
                events: auditEvents,
                total: auditEvents.length,
                entityType,
                entityId,
                pagination: {
                    limit,
                    offset,
                    hasMore: auditEvents.length === limit
                }
            };

        } catch (error) {
            logger.error('Failed to retrieve audit history', {
                entityType,
                entityId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get audit statistics for monitoring
     */
    async getAuditStatistics(timeRange = 24) {
        try {
            const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000));

            const result = await query(this.queries.getAuditStats, [since]);

            const statistics = {
                timeRange: `${timeRange} hours`,
                since: since.toISOString(),
                eventStats: result.rows.map(row => ({
                    eventType: row.event_type,
                    count: parseInt(row.count),
                    lastOccurrence: row.last_occurrence,
                    criticalCount: parseInt(row.critical_count)
                })),
                metrics: this.metrics,
                summary: {
                    totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
                    uniqueEventTypes: result.rows.length,
                    criticalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.critical_count), 0)
                }
            };

            return statistics;

        } catch (error) {
            logger.error('Failed to retrieve audit statistics', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(startDate, endDate, entityId = null) {
        try {
            const result = await query(this.queries.getComplianceReport, [
                startDate,
                endDate,
                entityId
            ]);

            const complianceEvents = result.rows.map(row => ({
                entityId: row.entity_id,
                eventType: row.event_type,
                userEmail: row.user_email,
                timestamp: row.timestamp,
                description: row.description,
                complianceCategory: row.compliance_category
            }));

            // Group by compliance category
            const categorizedEvents = complianceEvents.reduce((acc, event) => {
                const category = event.complianceCategory || 'uncategorized';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(event);
                return acc;
            }, {});

            return {
                reportPeriod: {
                    startDate,
                    endDate
                },
                totalEvents: complianceEvents.length,
                entityFilter: entityId,
                eventsByCategory: categorizedEvents,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to generate compliance report', {
                startDate,
                endDate,
                entityId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Search audit trail with filters
     */
    async searchAuditTrail(searchTerm, filters = {}) {
        try {
            const {
                eventType = null,
                severity = null,
                startDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
                endDate = new Date(),
                limit = 100,
                offset = 0
            } = filters;

            const searchPattern = `%${searchTerm}%`;

            const result = await query(this.queries.searchAuditTrail, [
                searchPattern,
                eventType,
                severity,
                startDate,
                endDate,
                Math.min(limit, 500), // Max 500 results
                offset
            ]);

            const searchResults = result.rows.map(row => ({
                id: row.id,
                eventType: row.event_type,
                entityType: row.entity_type,
                entityId: row.entity_id,
                userEmail: row.user_email,
                action: row.action,
                description: row.description,
                timestamp: row.timestamp,
                severity: row.severity
            }));

            return {
                searchTerm,
                filters,
                results: searchResults,
                resultCount: searchResults.length,
                hasMore: searchResults.length === Math.min(limit, 500)
            };

        } catch (error) {
            logger.error('Audit trail search failed', {
                searchTerm,
                filters,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Utility methods
     */
    determineSeverity(eventType, action, oldValues, newValues) {
        // Critical events
        if (eventType.includes('security.') || eventType.includes('user.role_changed')) {
            return 'critical';
        }

        // High severity events
        if (eventType.includes('bol.') || eventType.includes('compliance.')) {
            return 'high';
        }

        // Status changes are medium severity
        if (action && action.includes('status')) {
            return 'medium';
        }

        return 'low';
    }

    updateMetrics(eventType, severity, duration) {
        this.metrics.totalEvents++;

        if (severity === 'critical') {
            this.metrics.criticalEvents++;
        }

        // Update rolling average for log time
        this.metrics.avgLogTime = (this.metrics.avgLogTime + duration) / 2;

        // Count today's events (simple approximation)
        const hour = new Date().getHours();
        if (hour === 0) {
            this.metrics.eventsToday = 1; // Reset at midnight
        } else {
            this.metrics.eventsToday++;
        }
    }

    async cacheRecentEvent(entityType, entityId, auditRecord) {
        try {
            const cacheKey = `audit:${entityType}:${entityId}`;
            let recentEvents = await cacheService.get(cacheKey, { parseJson: true }) || [];

            // Add new event to front
            recentEvents.unshift({
                id: auditRecord.id,
                timestamp: auditRecord.timestamp,
                cached: true
            });

            // Keep only last 10 events in cache
            recentEvents = recentEvents.slice(0, 10);

            await cacheService.set(cacheKey, recentEvents, { ttl: 3600 }); // 1 hour cache

        } catch (error) {
            logger.warn('Failed to cache recent audit event', {
                entityType,
                entityId,
                error: error.message
            });
        }
    }

    /**
     * Performance monitoring
     */
    getPerformanceMetrics() {
        return {
            ...this.metrics,
            eventTypes: Object.keys(this.eventTypes).length,
            status: 'operational'
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Test database connectivity
            await query('SELECT 1');

            const isHealthy = this.metrics.failedLogs < 10; // Less than 10 failed logs

            return {
                status: isHealthy ? 'healthy' : 'degraded',
                metrics: this.getPerformanceMetrics(),
                lastCheck: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
        }
    }
}

module.exports = new AuditTrailService();