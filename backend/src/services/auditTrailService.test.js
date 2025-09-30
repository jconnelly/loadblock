const auditTrailService = require('./auditTrailService');
const { query } = require('../config/database');
const cacheService = require('./cacheService');

// Mock dependencies
jest.mock('../config/database');
jest.mock('./cacheService');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('AuditTrailService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logEvent', () => {
        beforeEach(() => {
            query.mockResolvedValue({
                rows: [{
                    id: 'audit-123',
                    timestamp: new Date()
                }]
            });
            cacheService.set = jest.fn().mockResolvedValue('OK');
        });

        it('should successfully log audit event', async () => {
            const eventData = {
                eventType: 'bol.status_changed',
                entityType: 'bol',
                entityId: 'bol-123',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    roles: ['shipper']
                },
                action: 'status_change_pending_to_approved',
                description: 'BoL status changed from pending to approved',
                oldValues: { status: 'pending' },
                newValues: { status: 'approved' },
                metadata: { workflowStep: 2 },
                request: { ip: '127.0.0.1', id: 'req-123' },
                complianceCategory: 'shipper_approval'
            };

            const result = await auditTrailService.logEvent(eventData);

            expect(result.success).toBe(true);
            expect(result.auditId).toBe('audit-123');
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO audit_trail'),
                expect.any(Array)
            );
            expect(cacheService.set).toHaveBeenCalled();
        });

        it('should handle system events without user', async () => {
            const eventData = {
                eventType: 'system.backup',
                entityType: 'system',
                entityId: 'backup_001',
                action: 'backup_completed',
                description: 'System backup completed successfully',
                metadata: { backupSize: '1.2GB' }
            };

            const result = await auditTrailService.logEvent(eventData);

            expect(result.success).toBe(true);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO audit_trail'),
                expect.arrayContaining([
                    'system.backup',
                    'system',
                    'backup_001',
                    null, // userId
                    'system', // userEmail
                    null // userRoles
                ])
            );
        });

        it('should determine severity correctly', async () => {
            const criticalEvent = {
                eventType: 'security.unauthorized_access',
                entityType: 'system',
                entityId: 'security_001',
                action: 'unauthorized_access_attempt',
                description: 'Unauthorized access attempt detected'
            };

            await auditTrailService.logEvent(criticalEvent);

            const callArgs = query.mock.calls[0][1];
            const severity = callArgs[15]; // Severity is at index 15
            expect(severity).toBe('critical');
        });

        it('should handle logging failures gracefully', async () => {
            query.mockRejectedValue(new Error('Database connection failed'));

            const eventData = {
                eventType: 'bol.created',
                entityType: 'bol',
                entityId: 'bol-123',
                action: 'create_bol',
                description: 'New BoL created'
            };

            await expect(auditTrailService.logEvent(eventData)).rejects.toThrow('Database connection failed');
        });
    });

    describe('getAuditHistory', () => {
        beforeEach(() => {
            cacheService.get = jest.fn().mockResolvedValue(null);
            query.mockResolvedValue({
                rows: [
                    {
                        id: 'audit-1',
                        event_type: 'bol.status_changed',
                        entity_type: 'bol',
                        entity_id: 'bol-123',
                        user_email: 'test@example.com',
                        action: 'status_change',
                        description: 'Status changed to approved',
                        old_values: '{"status":"pending"}',
                        new_values: '{"status":"approved"}',
                        metadata: '{"workflowStep":2}',
                        ip_address: '127.0.0.1',
                        timestamp: new Date(),
                        severity: 'high',
                        compliance_category: 'shipper_approval'
                    }
                ]
            });
        });

        it('should retrieve audit history successfully', async () => {
            const result = await auditTrailService.getAuditHistory('bol', 'bol-123');

            expect(result.events).toHaveLength(1);
            expect(result.events[0].eventType).toBe('bol.status_changed');
            expect(result.events[0].oldValues).toEqual({ status: 'pending' });
            expect(result.events[0].newValues).toEqual({ status: 'approved' });
            expect(result.entityType).toBe('bol');
            expect(result.entityId).toBe('bol-123');
        });

        it('should apply pagination correctly', async () => {
            await auditTrailService.getAuditHistory('bol', 'bol-123', {
                limit: 25,
                offset: 50
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $3 OFFSET $4'),
                ['bol', 'bol-123', 25, 50]
            );
        });

        it('should enforce maximum limit', async () => {
            await auditTrailService.getAuditHistory('bol', 'bol-123', {
                limit: 1000 // Exceeds max of 500
            });

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([500]) // Should be capped at 500
            );
        });
    });

    describe('getAuditStatistics', () => {
        beforeEach(() => {
            query.mockResolvedValue({
                rows: [
                    {
                        event_type: 'bol.status_changed',
                        count: '25',
                        last_occurrence: new Date(),
                        critical_count: '2'
                    },
                    {
                        event_type: 'user.login',
                        count: '150',
                        last_occurrence: new Date(),
                        critical_count: '0'
                    }
                ]
            });
        });

        it('should return audit statistics', async () => {
            const result = await auditTrailService.getAuditStatistics(24);

            expect(result.timeRange).toBe('24 hours');
            expect(result.eventStats).toHaveLength(2);
            expect(result.eventStats[0].eventType).toBe('bol.status_changed');
            expect(result.eventStats[0].count).toBe(25);
            expect(result.summary.totalEvents).toBe(175);
            expect(result.summary.criticalEvents).toBe(2);
        });

        it('should handle custom time ranges', async () => {
            await auditTrailService.getAuditStatistics(72);

            const callArgs = query.mock.calls[0][1];
            const sinceDate = callArgs[0];
            const expectedTime = Date.now() - (72 * 60 * 60 * 1000);
            expect(sinceDate.getTime()).toBeCloseTo(expectedTime, -10000); // Within 10 seconds
        });
    });

    describe('generateComplianceReport', () => {
        beforeEach(() => {
            query.mockResolvedValue({
                rows: [
                    {
                        entity_id: 'bol-123',
                        event_type: 'bol.status_changed',
                        user_email: 'shipper@example.com',
                        timestamp: new Date(),
                        description: 'Status approved',
                        compliance_category: 'shipper_approval'
                    },
                    {
                        entity_id: 'bol-124',
                        event_type: 'compliance.signature_applied',
                        user_email: 'carrier@example.com',
                        timestamp: new Date(),
                        description: 'Digital signature applied',
                        compliance_category: 'carrier_commitment'
                    }
                ]
            });
        });

        it('should generate compliance report', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-01-31';

            const result = await auditTrailService.generateComplianceReport(startDate, endDate);

            expect(result.reportPeriod.startDate).toBe(startDate);
            expect(result.reportPeriod.endDate).toBe(endDate);
            expect(result.totalEvents).toBe(2);
            expect(result.eventsByCategory).toHaveProperty('shipper_approval');
            expect(result.eventsByCategory).toHaveProperty('carrier_commitment');
            expect(result.generatedAt).toBeDefined();
        });

        it('should filter by entity ID when provided', async () => {
            await auditTrailService.generateComplianceReport(
                '2024-01-01',
                '2024-01-31',
                'bol-123'
            );

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['2024-01-01', '2024-01-31', 'bol-123']
            );
        });

        it('should handle null entity filter', async () => {
            await auditTrailService.generateComplianceReport(
                '2024-01-01',
                '2024-01-31',
                null
            );

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['2024-01-01', '2024-01-31', null]
            );
        });
    });

    describe('searchAuditTrail', () => {
        beforeEach(() => {
            query.mockResolvedValue({
                rows: [
                    {
                        id: 'audit-1',
                        event_type: 'bol.status_changed',
                        entity_type: 'bol',
                        entity_id: 'bol-123',
                        user_email: 'test@example.com',
                        action: 'status_change',
                        description: 'Status changed to approved',
                        timestamp: new Date(),
                        severity: 'high'
                    }
                ]
            });
        });

        it('should search audit trail with term', async () => {
            const result = await auditTrailService.searchAuditTrail('approved');

            expect(result.searchTerm).toBe('approved');
            expect(result.results).toHaveLength(1);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('LIKE LOWER($1)'),
                expect.arrayContaining(['%approved%'])
            );
        });

        it('should apply filters correctly', async () => {
            const filters = {
                eventType: 'bol.status_changed',
                severity: 'high',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                limit: 50,
                offset: 0
            };

            await auditTrailService.searchAuditTrail('test', filters);

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                [
                    '%test%',
                    'bol.status_changed',
                    'high',
                    filters.startDate,
                    filters.endDate,
                    50,
                    0
                ]
            );
        });

        it('should enforce search result limits', async () => {
            const filters = { limit: 1000 }; // Exceeds max of 500

            await auditTrailService.searchAuditTrail('test', filters);

            const callArgs = query.mock.calls[0][1];
            const limit = callArgs[5];
            expect(limit).toBe(500); // Should be capped at 500
        });
    });

    describe('utility methods', () => {
        describe('determineSeverity', () => {
            it('should classify security events as critical', () => {
                const severity = auditTrailService.determineSeverity(
                    'security.unauthorized_access',
                    'access_attempt',
                    null,
                    null
                );
                expect(severity).toBe('critical');
            });

            it('should classify BoL events as high', () => {
                const severity = auditTrailService.determineSeverity(
                    'bol.status_changed',
                    'status_update',
                    null,
                    null
                );
                expect(severity).toBe('high');
            });

            it('should classify status changes as medium', () => {
                const severity = auditTrailService.determineSeverity(
                    'user.profile_updated',
                    'status_change',
                    null,
                    null
                );
                expect(severity).toBe('medium');
            });

            it('should default to low severity', () => {
                const severity = auditTrailService.determineSeverity(
                    'user.login',
                    'login',
                    null,
                    null
                );
                expect(severity).toBe('low');
            });
        });

        describe('updateMetrics', () => {
            it('should update performance metrics', () => {
                const initialTotal = auditTrailService.metrics.totalEvents;

                auditTrailService.updateMetrics('bol.status_changed', 'high', 25.5);

                expect(auditTrailService.metrics.totalEvents).toBe(initialTotal + 1);
                expect(auditTrailService.metrics.avgLogTime).toBeGreaterThan(0);
            });

            it('should track critical events', () => {
                const initialCritical = auditTrailService.metrics.criticalEvents;

                auditTrailService.updateMetrics('security.breach', 'critical', 10);

                expect(auditTrailService.metrics.criticalEvents).toBe(initialCritical + 1);
            });
        });
    });

    describe('performance and health', () => {
        it('should return performance metrics', () => {
            const metrics = auditTrailService.getPerformanceMetrics();

            expect(metrics).toHaveProperty('totalEvents');
            expect(metrics).toHaveProperty('eventsToday');
            expect(metrics).toHaveProperty('criticalEvents');
            expect(metrics).toHaveProperty('avgLogTime');
            expect(metrics).toHaveProperty('failedLogs');
            expect(metrics.status).toBe('operational');
        });

        it('should return healthy status', async () => {
            query.mockResolvedValue({ rows: [{ result: 1 }] });

            const health = await auditTrailService.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.metrics).toBeDefined();
            expect(health.lastCheck).toBeDefined();
        });

        it('should return degraded status with many failed logs', async () => {
            // Simulate failed logs
            auditTrailService.metrics.failedLogs = 15;
            query.mockResolvedValue({ rows: [{ result: 1 }] });

            const health = await auditTrailService.healthCheck();

            expect(health.status).toBe('degraded');
        });

        it('should return unhealthy status on database failure', async () => {
            query.mockRejectedValue(new Error('Database error'));

            const health = await auditTrailService.healthCheck();

            expect(health.status).toBe('unhealthy');
            expect(health.error).toContain('Database error');
        });
    });
});