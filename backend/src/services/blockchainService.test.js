const blockchainService = require('./blockchainService');
const cacheService = require('./cacheService');

// Mock dependencies
jest.mock('./cacheService');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('BlockchainService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset metrics
        blockchainService.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            avgTransactionTime: 0,
            pendingTransactions: 0,
            blockchainSyncStatus: 'synced'
        };

        // Reset transaction queue
        blockchainService.transactionQueue = [];

        // Mock cache service
        cacheService.get = jest.fn().mockResolvedValue(null);
        cacheService.set = jest.fn().mockResolvedValue('OK');
        cacheService.del = jest.fn().mockResolvedValue(1);
    });

    describe('updateBoLStatus', () => {
        const mockBoLData = {
            bolId: 'bol-123',
            status: 'approved',
            updatedBy: 'user-123',
            timestamp: new Date().toISOString(),
            metadata: { workflowStep: 2 }
        };

        it('should queue blockchain transaction successfully', async () => {
            const result = await blockchainService.updateBoLStatus(
                'bol-123',
                mockBoLData,
                { priority: 'high' }
            );

            expect(result.success).toBe(true);
            expect(result.transactionId).toBeDefined();
            expect(result.status).toBe('queued');
            expect(blockchainService.transactionQueue.length).toBe(1);

            const queuedTransaction = blockchainService.transactionQueue[0];
            expect(queuedTransaction.bolId).toBe('bol-123');
            expect(queuedTransaction.priority).toBe('high');
            expect(queuedTransaction.status).toBe('pending');
        });

        it('should handle different priority levels', async () => {
            await blockchainService.updateBoLStatus('bol-1', mockBoLData, { priority: 'high' });
            await blockchainService.updateBoLStatus('bol-2', mockBoLData, { priority: 'normal' });
            await blockchainService.updateBoLStatus('bol-3', mockBoLData, { priority: 'low' });

            expect(blockchainService.transactionQueue.length).toBe(3);

            // Check priority ordering (assuming queue is sorted by priority)
            const priorities = blockchainService.transactionQueue.map(tx => tx.priority);
            expect(priorities).toContain('high');
            expect(priorities).toContain('normal');
            expect(priorities).toContain('low');
        });

        it('should generate unique transaction IDs', async () => {
            const result1 = await blockchainService.updateBoLStatus('bol-1', mockBoLData);
            const result2 = await blockchainService.updateBoLStatus('bol-2', mockBoLData);

            expect(result1.transactionId).not.toBe(result2.transactionId);
        });

        it('should include blockchain hash in response', async () => {
            const result = await blockchainService.updateBoLStatus('bol-123', mockBoLData);

            expect(result.blockchainHash).toBeDefined();
            expect(typeof result.blockchainHash).toBe('string');
            expect(result.blockchainHash.length).toBeGreaterThan(0);
        });
    });

    describe('createBoL', () => {
        const mockBoLCreationData = {
            bolNumber: 'BOL-2024-000001',
            shipper: { companyName: 'ABC Shipping' },
            consignee: { companyName: 'XYZ Logistics' },
            carrier: { companyName: 'Fast Transport' },
            cargoItems: [{ description: 'Electronics', quantity: 100 }],
            createdBy: 'user-123'
        };

        it('should create BoL on blockchain successfully', async () => {
            const result = await blockchainService.createBoL('bol-123', mockBoLCreationData);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBeDefined();
            expect(result.status).toBe('queued');
            expect(result.immutableHash).toBeDefined();
        });

        it('should calculate immutable hash consistently', async () => {
            const result1 = await blockchainService.createBoL('bol-123', mockBoLCreationData);
            const result2 = await blockchainService.createBoL('bol-123', mockBoLCreationData);

            // Same data should produce same hash
            expect(result1.immutableHash).toBe(result2.immutableHash);
        });

        it('should include creation metadata', async () => {
            const result = await blockchainService.createBoL('bol-123', mockBoLCreationData);

            const queuedTransaction = blockchainService.transactionQueue.find(
                tx => tx.transactionId === result.transactionId
            );

            expect(queuedTransaction.type).toBe('create');
            expect(queuedTransaction.data).toEqual(expect.objectContaining(mockBoLCreationData));
            expect(queuedTransaction.immutableHash).toBeDefined();
        });
    });

    describe('getBoLHistory', () => {
        beforeEach(() => {
            // Mock cached blockchain history
            cacheService.get.mockResolvedValue(JSON.stringify([
                {
                    transactionId: 'tx-001',
                    type: 'create',
                    status: 'committed',
                    timestamp: '2024-01-15T10:30:00Z',
                    blockNumber: 12345,
                    blockHash: '0xabc123'
                },
                {
                    transactionId: 'tx-002',
                    type: 'status_update',
                    status: 'committed',
                    timestamp: '2024-01-15T11:30:00Z',
                    blockNumber: 12346,
                    blockHash: '0xdef456'
                }
            ]));
        });

        it('should retrieve BoL blockchain history', async () => {
            const result = await blockchainService.getBoLHistory('bol-123');

            expect(result.success).toBe(true);
            expect(result.transactions).toHaveLength(2);
            expect(result.transactions[0].type).toBe('create');
            expect(result.transactions[1].type).toBe('status_update');
        });

        it('should apply pagination to history', async () => {
            const result = await blockchainService.getBoLHistory('bol-123', {
                limit: 1,
                offset: 0
            });

            expect(result.transactions).toHaveLength(1);
            expect(result.pagination).toEqual({
                limit: 1,
                offset: 0,
                hasMore: true
            });
        });

        it('should handle empty history', async () => {
            cacheService.get.mockResolvedValue(null);

            const result = await blockchainService.getBoLHistory('bol-nonexistent');

            expect(result.success).toBe(true);
            expect(result.transactions).toHaveLength(0);
        });
    });

    describe('verifyBoLIntegrity', () => {
        it('should verify BoL integrity successfully', async () => {
            const bolData = {
                bolNumber: 'BOL-2024-000001',
                status: 'approved',
                shipper: { companyName: 'ABC Shipping' }
            };

            const result = await blockchainService.verifyBoLIntegrity('bol-123', bolData);

            expect(result.verified).toBe(true);
            expect(result.currentHash).toBeDefined();
            expect(result.blockchainHash).toBeDefined();
            expect(result.isValid).toBe(true);
        });

        it('should detect data tampering', async () => {
            const originalData = {
                bolNumber: 'BOL-2024-000001',
                status: 'approved'
            };

            const tamperedData = {
                bolNumber: 'BOL-2024-000001',
                status: 'delivered' // Changed status
            };

            // Mock blockchain returning original hash
            cacheService.get.mockResolvedValue(JSON.stringify({
                hash: blockchainService.calculateHash(originalData)
            }));

            const result = await blockchainService.verifyBoLIntegrity('bol-123', tamperedData);

            expect(result.verified).toBe(false);
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('tampering');
        });

        it('should handle missing blockchain record', async () => {
            cacheService.get.mockResolvedValue(null);

            const result = await blockchainService.verifyBoLIntegrity('bol-nonexistent', {});

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('not found');
        });
    });

    describe('processTransactionQueue', () => {
        beforeEach(() => {
            // Mock successful blockchain transaction processing
            jest.spyOn(blockchainService, 'submitToBlockchain')
                .mockResolvedValue({
                    success: true,
                    blockHash: '0xabc123',
                    blockNumber: 12345,
                    transactionHash: '0xdef456'
                });
        });

        it('should process queued transactions', async () => {
            // Add transactions to queue
            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' }, { priority: 'high' });
            await blockchainService.updateBoLStatus('bol-2', { status: 'assigned' }, { priority: 'normal' });

            expect(blockchainService.transactionQueue.length).toBe(2);

            await blockchainService.processTransactionQueue();

            // Transactions should be processed and removed from queue
            expect(blockchainService.transactionQueue.length).toBe(0);
            expect(blockchainService.submitToBlockchain).toHaveBeenCalledTimes(2);
        });

        it('should handle transaction failures gracefully', async () => {
            // Mock one successful and one failed transaction
            blockchainService.submitToBlockchain
                .mockResolvedValueOnce({ success: true, blockHash: '0xabc123' })
                .mockRejectedValueOnce(new Error('Blockchain network error'));

            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });
            await blockchainService.updateBoLStatus('bol-2', { status: 'assigned' });

            await blockchainService.processTransactionQueue();

            expect(blockchainService.metrics.successfulTransactions).toBe(1);
            expect(blockchainService.metrics.failedTransactions).toBe(1);
        });

        it('should retry failed transactions', async () => {
            blockchainService.submitToBlockchain
                .mockRejectedValueOnce(new Error('Temporary network error'))
                .mockResolvedValueOnce({ success: true, blockHash: '0xabc123' });

            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });

            // First processing attempt should fail and retry
            await blockchainService.processTransactionQueue();

            // Transaction should be retried and succeed
            expect(blockchainService.submitToBlockchain).toHaveBeenCalledTimes(2);
            expect(blockchainService.metrics.successfulTransactions).toBe(1);
        });
    });

    describe('blockchain synchronization', () => {
        it('should sync with blockchain network', async () => {
            const result = await blockchainService.syncWithBlockchain();

            expect(result.success).toBe(true);
            expect(result.syncStatus).toBe('completed');
            expect(result.latestBlock).toBeDefined();
            expect(blockchainService.metrics.blockchainSyncStatus).toBe('synced');
        });

        it('should handle sync failures', async () => {
            // Mock sync failure
            jest.spyOn(blockchainService, 'getLatestBlockNumber')
                .mockRejectedValue(new Error('Network unavailable'));

            const result = await blockchainService.syncWithBlockchain();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network unavailable');
            expect(blockchainService.metrics.blockchainSyncStatus).toBe('error');
        });

        it('should check sync status', async () => {
            const status = await blockchainService.getSyncStatus();

            expect(status).toHaveProperty('isSynced');
            expect(status).toHaveProperty('latestBlock');
            expect(status).toHaveProperty('networkStatus');
            expect(status).toHaveProperty('lastSyncTime');
        });
    });

    describe('utility methods', () => {
        it('should calculate consistent hashes', () => {
            const data1 = { bolNumber: 'BOL-123', status: 'approved' };
            const data2 = { bolNumber: 'BOL-123', status: 'approved' };
            const data3 = { bolNumber: 'BOL-123', status: 'delivered' };

            const hash1 = blockchainService.calculateHash(data1);
            const hash2 = blockchainService.calculateHash(data2);
            const hash3 = blockchainService.calculateHash(data3);

            expect(hash1).toBe(hash2); // Same data should produce same hash
            expect(hash1).not.toBe(hash3); // Different data should produce different hash
        });

        it('should generate transaction IDs', () => {
            const txId1 = blockchainService.generateTransactionId();
            const txId2 = blockchainService.generateTransactionId();

            expect(txId1).not.toBe(txId2);
            expect(txId1).toMatch(/^tx-[a-f0-9]{32}$/); // Expected format
        });

        it('should validate blockchain addresses', () => {
            const validAddress = '0x742bDA8A2b4D07D782b5f6FF889074C5A14077bB';
            const invalidAddress = 'invalid-address';

            expect(blockchainService.isValidAddress(validAddress)).toBe(true);
            expect(blockchainService.isValidAddress(invalidAddress)).toBe(false);
        });
    });

    describe('performance monitoring', () => {
        it('should track performance metrics', async () => {
            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });
            await blockchainService.updateBoLStatus('bol-2', { status: 'assigned' });

            const metrics = blockchainService.getPerformanceMetrics();

            expect(metrics).toHaveProperty('totalTransactions');
            expect(metrics).toHaveProperty('successfulTransactions');
            expect(metrics).toHaveProperty('failedTransactions');
            expect(metrics).toHaveProperty('avgTransactionTime');
            expect(metrics).toHaveProperty('pendingTransactions');
            expect(metrics).toHaveProperty('queueDepth');
            expect(metrics.queueDepth).toBe(2);
        });

        it('should calculate average transaction time', async () => {
            // Mock transaction timing
            jest.spyOn(blockchainService, 'submitToBlockchain')
                .mockImplementation(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return { success: true, blockHash: '0xabc123' };
                });

            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });
            await blockchainService.processTransactionQueue();

            const metrics = blockchainService.getPerformanceMetrics();
            expect(metrics.avgTransactionTime).toBeGreaterThan(0);
        });
    });

    describe('health checks', () => {
        it('should return healthy status', async () => {
            const health = await blockchainService.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.networkConnected).toBe(true);
            expect(health.syncStatus).toBe('synced');
            expect(health.queueLength).toBeDefined();
            expect(health.lastCheck).toBeDefined();
        });

        it('should return unhealthy status on network failure', async () => {
            // Mock network failure
            jest.spyOn(blockchainService, 'checkNetworkConnection')
                .mockResolvedValue(false);

            const health = await blockchainService.healthCheck();

            expect(health.status).toBe('unhealthy');
            expect(health.networkConnected).toBe(false);
        });

        it('should return degraded status with large queue', async () => {
            // Fill queue with many transactions
            for (let i = 0; i < 150; i++) {
                await blockchainService.updateBoLStatus(`bol-${i}`, { status: 'approved' });
            }

            const health = await blockchainService.healthCheck();

            expect(health.status).toBe('degraded');
            expect(health.queueLength).toBeGreaterThan(100);
        });
    });

    describe('error handling', () => {
        it('should handle blockchain network errors', async () => {
            jest.spyOn(blockchainService, 'submitToBlockchain')
                .mockRejectedValue(new Error('Network timeout'));

            const result = await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });

            // Should still queue transaction even if immediate submission fails
            expect(result.success).toBe(true);
            expect(result.status).toBe('queued');
        });

        it('should handle invalid transaction data', async () => {
            const invalidData = null;

            await expect(
                blockchainService.updateBoLStatus('bol-1', invalidData)
            ).rejects.toThrow('Invalid transaction data');
        });

        it('should handle queue overflow', async () => {
            // Mock queue limit
            const originalQueueLimit = blockchainService.maxQueueSize;
            blockchainService.maxQueueSize = 2;

            await blockchainService.updateBoLStatus('bol-1', { status: 'approved' });
            await blockchainService.updateBoLStatus('bol-2', { status: 'assigned' });

            // Third transaction should trigger queue overflow handling
            await expect(
                blockchainService.updateBoLStatus('bol-3', { status: 'delivered' })
            ).rejects.toThrow('Transaction queue full');

            // Restore original limit
            blockchainService.maxQueueSize = originalQueueLimit;
        });
    });
});