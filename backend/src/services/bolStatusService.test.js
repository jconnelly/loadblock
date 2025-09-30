const bolStatusService = require('./bolStatusService');
const { query, transaction } = require('../config/database');
const auditTrailService = require('./auditTrailService');

// Mock dependencies
jest.mock('../config/database');
jest.mock('./auditTrailService');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('BoLStatusService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateStatusTransition', () => {
        it('should validate valid status transitions', () => {
            const result = bolStatusService.validateStatusTransition('pending', 'approved');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid status transitions', () => {
            const result = bolStatusService.validateStatusTransition('pending', 'delivered');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Invalid transition');
        });

        it('should validate required fields for status transition', () => {
            const metadata = {};
            const result = bolStatusService.validateStatusTransition('pending', 'approved', metadata);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Missing required fields');
        });

        it('should validate signature requirements', () => {
            const metadata = {
                approvedBy: 'user123',
                approvalTimestamp: new Date().toISOString()
            };
            const result = bolStatusService.validateStatusTransition('pending', 'approved', metadata);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Digital signature required');
        });

        it('should pass validation with all required fields and signature', () => {
            const metadata = {
                approvedBy: 'user123',
                approvalTimestamp: new Date().toISOString(),
                signature: 'digital-signature-hash'
            };
            const result = bolStatusService.validateStatusTransition('pending', 'approved', metadata);
            expect(result.valid).toBe(true);
        });
    });

    describe('getValidNextStatuses', () => {
        it('should return valid next statuses for pending status', () => {
            const nextStatuses = bolStatusService.getValidNextStatuses('pending', ['shipper']);
            expect(nextStatuses).toContain('approved');
            expect(nextStatuses).toContain('cancelled');
        });

        it('should filter statuses based on user roles', () => {
            const nextStatuses = bolStatusService.getValidNextStatuses('approved', ['broker']);
            expect(nextStatuses).toContain('assigned');
            expect(nextStatuses).not.toContain('accepted'); // Only carrier can accept
        });

        it('should allow admin to access all statuses', () => {
            const nextStatuses = bolStatusService.getValidNextStatuses('assigned', ['admin']);
            expect(nextStatuses).toContain('accepted');
            expect(nextStatuses).toContain('rejected');
            expect(nextStatuses).toContain('cancelled');
        });
    });

    describe('getWorkflowInfo', () => {
        it('should return workflow information for valid status', () => {
            const info = bolStatusService.getWorkflowInfo('approved');
            expect(info).toBeDefined();
            expect(info.description).toContain('Shipper approved');
            expect(info.requiresSignature).toBe(true);
            expect(info.roles).toContain('shipper');
        });

        it('should return null for invalid status', () => {
            const info = bolStatusService.getWorkflowInfo('invalid_status');
            expect(info).toBeNull();
        });
    });

    describe('getWorkflowSummary', () => {
        it('should return complete workflow summary', () => {
            const summary = bolStatusService.getWorkflowSummary();
            expect(Array.isArray(summary)).toBe(true);
            expect(summary.length).toBeGreaterThan(9);

            const pendingStatus = summary.find(s => s.status === 'pending');
            expect(pendingStatus).toBeDefined();
            expect(pendingStatus.nextStates).toContain('approved');
        });

        it('should include terminal states in summary', () => {
            const summary = bolStatusService.getWorkflowSummary();
            const terminalStates = summary.filter(s => s.isTerminal);
            expect(terminalStates.length).toBeGreaterThan(0);

            const paidStatus = terminalStates.find(s => s.status === 'paid');
            expect(paidStatus).toBeDefined();
        });
    });

    describe('updateStatus', () => {
        beforeEach(() => {
            // Mock Redis client methods
            bolStatusService.redis = {
                get: jest.fn().mockResolvedValue(null),
                setex: jest.fn().mockResolvedValue('OK'),
                del: jest.fn().mockResolvedValue(1),
                lpush: jest.fn().mockResolvedValue(1),
                publish: jest.fn().mockResolvedValue(1)
            };

            // Mock database queries
            query.mockResolvedValue({
                rows: [{
                    id: 'bol-123',
                    status: 'pending',
                    version: 1
                }]
            });

            transaction.mockImplementation(async (callback) => {
                const mockClient = {
                    query: jest.fn().mockResolvedValue({
                        rows: [{
                            id: 'bol-123',
                            status: 'approved',
                            version: 2,
                            status_updated_at: new Date()
                        }]
                    })
                };
                return await callback(mockClient);
            });

            auditTrailService.logEvent.mockResolvedValue({ success: true });
        });

        it('should successfully update status with valid transition', async () => {
            // Cache valid BoL data
            bolStatusService.redis.get.mockResolvedValueOnce(JSON.stringify({
                id: 'bol-123',
                status: 'pending',
                version: 1
            }));

            const result = await bolStatusService.updateStatus(
                'bol-123',
                'approved',
                'user-123',
                'Approved by shipper',
                {
                    approvedBy: 'user-123',
                    approvalTimestamp: new Date().toISOString(),
                    signature: 'digital-signature'
                },
                ['shipper'],
                {
                    email: 'shipper@example.com',
                    roles: ['shipper']
                }
            );

            expect(result.success).toBe(true);
            expect(result.data.status).toBe('approved');
            expect(transaction).toHaveBeenCalled();
        });

        it('should reject invalid status transition', async () => {
            bolStatusService.redis.get.mockResolvedValueOnce(JSON.stringify({
                id: 'bol-123',
                status: 'pending',
                version: 1
            }));

            await expect(bolStatusService.updateStatus(
                'bol-123',
                'delivered', // Invalid transition from pending
                'user-123',
                'Invalid transition',
                {},
                ['shipper']
            )).rejects.toThrow('Invalid transition');
        });

        it('should reject update with insufficient permissions', async () => {
            bolStatusService.redis.get.mockResolvedValueOnce(JSON.stringify({
                id: 'bol-123',
                status: 'assigned',
                version: 1
            }));

            await expect(bolStatusService.updateStatus(
                'bol-123',
                'accepted',
                'user-123',
                'Trying to accept',
                {
                    acceptedBy: 'user-123',
                    acceptanceTimestamp: new Date().toISOString(),
                    signature: 'signature'
                },
                ['shipper'] // Only carrier can accept
            )).rejects.toThrow('Insufficient permissions');
        });

        it('should handle missing required fields', async () => {
            bolStatusService.redis.get.mockResolvedValueOnce(JSON.stringify({
                id: 'bol-123',
                status: 'pending',
                version: 1
            }));

            await expect(bolStatusService.updateStatus(
                'bol-123',
                'approved',
                'user-123',
                'Missing fields',
                {}, // Missing required fields
                ['shipper']
            )).rejects.toThrow('Missing required fields');
        });
    });

    describe('batchUpdateStatus', () => {
        beforeEach(() => {
            // Mock individual update method
            jest.spyOn(bolStatusService, 'updateStatus')
                .mockResolvedValue({ success: true, data: { status: 'updated' } });
        });

        it('should process batch updates successfully', async () => {
            const updates = [
                { bolId: 'bol-1', status: 'approved', userId: 'user-1', notes: 'Batch 1' },
                { bolId: 'bol-2', status: 'assigned', userId: 'user-2', notes: 'Batch 2' }
            ];

            const results = await bolStatusService.batchUpdateStatus(updates);

            expect(results).toHaveLength(2);
            expect(results.every(r => r.success)).toBe(true);
            expect(bolStatusService.updateStatus).toHaveBeenCalledTimes(2);
        });

        it('should handle partial failures in batch', async () => {
            bolStatusService.updateStatus
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(new Error('Update failed'));

            const updates = [
                { bolId: 'bol-1', status: 'approved', userId: 'user-1' },
                { bolId: 'bol-2', status: 'invalid', userId: 'user-2' }
            ];

            const results = await bolStatusService.batchUpdateStatus(updates);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].error).toBeDefined();
        });
    });

    describe('getWorkflowStep', () => {
        it('should return correct step numbers', () => {
            expect(bolStatusService.getWorkflowStep('pending')).toBe(1);
            expect(bolStatusService.getWorkflowStep('approved')).toBe(2);
            expect(bolStatusService.getWorkflowStep('paid')).toBe(9);
        });

        it('should return 0 for unknown status', () => {
            expect(bolStatusService.getWorkflowStep('unknown')).toBe(0);
        });
    });

    describe('getComplianceCategory', () => {
        it('should return correct compliance categories', () => {
            expect(bolStatusService.getComplianceCategory('approved')).toBe('shipper_approval');
            expect(bolStatusService.getComplianceCategory('delivered')).toBe('delivery_confirmation');
            expect(bolStatusService.getComplianceCategory('paid')).toBe('financial_settlement');
        });

        it('should return null for non-compliance statuses', () => {
            expect(bolStatusService.getComplianceCategory('pending')).toBeNull();
            expect(bolStatusService.getComplianceCategory('en_route')).toBeNull();
        });
    });

    describe('performance and health checks', () => {
        it('should return performance metrics', async () => {
            const metrics = await bolStatusService.getPerformanceMetrics();
            expect(metrics).toBeDefined();
            expect(typeof metrics.cache_hit_ratio).toBe('number');
        });

        it('should return health check status', async () => {
            query.mockResolvedValueOnce({ rows: [{ result: 1 }] });

            const health = await bolStatusService.healthCheck();
            expect(health.status).toBe('healthy');
            expect(health.timestamp).toBeDefined();
        });

        it('should return unhealthy status on database failure', async () => {
            query.mockRejectedValueOnce(new Error('Database connection failed'));

            const health = await bolStatusService.healthCheck();
            expect(health.status).toBe('unhealthy');
            expect(health.error).toContain('Database connection failed');
        });
    });
});