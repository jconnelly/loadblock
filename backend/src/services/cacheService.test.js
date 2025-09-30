const cacheService = require('./cacheService');

// Mock logger
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('CacheService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset metrics
        cacheService.metrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            avgResponseTime: 0,
            totalOperations: 0
        };
    });

    describe('basic cache operations', () => {
        it('should store and retrieve string values', async () => {
            const key = 'test_key';
            const value = 'test_value';

            await cacheService.set(key, value);
            const result = await cacheService.get(key);

            expect(result).toBe(value);
        });

        it('should store and retrieve with TTL', async () => {
            const key = 'ttl_key';
            const value = 'ttl_value';
            const ttl = 10; // 10 seconds

            await cacheService.set(key, value, { ttl });
            const result = await cacheService.get(key);

            expect(result).toBe(value);
        });

        it('should handle JSON serialization automatically', async () => {
            const key = 'json_key';
            const value = { name: 'test', data: [1, 2, 3] };

            await cacheService.set(key, value);
            const result = await cacheService.get(key, { parseJson: true });

            expect(result).toEqual(value);
        });

        it('should return null for non-existent keys', async () => {
            const result = await cacheService.get('non_existent_key');
            expect(result).toBeNull();
        });

        it('should delete keys successfully', async () => {
            const key = 'delete_key';
            const value = 'delete_value';

            await cacheService.set(key, value);
            await cacheService.del(key);
            const result = await cacheService.get(key);

            expect(result).toBeNull();
        });
    });

    describe('advanced cache operations', () => {
        it('should handle cache misses and update metrics', async () => {
            const initialMisses = cacheService.metrics.misses;

            await cacheService.get('non_existent_key');

            expect(cacheService.metrics.misses).toBe(initialMisses + 1);
        });

        it('should handle cache hits and update metrics', async () => {
            const key = 'hit_test';
            const value = 'hit_value';

            await cacheService.set(key, value);

            const initialHits = cacheService.metrics.hits;
            await cacheService.get(key);

            expect(cacheService.metrics.hits).toBe(initialHits + 1);
        });

        it('should check if key exists', async () => {
            const key = 'exists_test';
            const value = 'exists_value';

            let exists = await cacheService.exists(key);
            expect(exists).toBe(false);

            await cacheService.set(key, value);
            exists = await cacheService.exists(key);
            expect(exists).toBe(true);
        });

        it('should get keys by pattern', async () => {
            await cacheService.set('user:123', 'user_data_123');
            await cacheService.set('user:456', 'user_data_456');
            await cacheService.set('bol:789', 'bol_data_789');

            const userKeys = await cacheService.keys('user:*');
            expect(userKeys).toContain('user:123');
            expect(userKeys).toContain('user:456');
            expect(userKeys).not.toContain('bol:789');
        });

        it('should invalidate pattern-matched keys', async () => {
            await cacheService.set('session:user1', 'session_data_1');
            await cacheService.set('session:user2', 'session_data_2');
            await cacheService.set('cache:data', 'cache_data');

            await cacheService.invalidatePattern('session:*');

            const session1 = await cacheService.get('session:user1');
            const session2 = await cacheService.get('session:user2');
            const cacheData = await cacheService.get('cache:data');

            expect(session1).toBeNull();
            expect(session2).toBeNull();
            expect(cacheData).toBe('cache_data'); // Should not be affected
        });
    });

    describe('rate limiting', () => {
        it('should allow requests within rate limit', async () => {
            const key = 'rate_limit_test';
            const limit = 5;
            const window = 60; // 60 seconds

            const result = await cacheService.checkRateLimit(key, limit, window);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(limit - 1);
            expect(result.resetTime).toBeGreaterThan(Date.now());
        });

        it('should block requests exceeding rate limit', async () => {
            const key = 'rate_limit_block_test';
            const limit = 2;
            const window = 60;

            // Make requests up to limit
            await cacheService.checkRateLimit(key, limit, window);
            await cacheService.checkRateLimit(key, limit, window);

            // This should be blocked
            const result = await cacheService.checkRateLimit(key, limit, window);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should reset rate limit after window expires', async () => {
            const key = 'rate_limit_reset_test';
            const limit = 1;
            const window = 1; // 1 second

            // Exhaust limit
            await cacheService.checkRateLimit(key, limit, window);
            let result = await cacheService.checkRateLimit(key, limit, window);
            expect(result.allowed).toBe(false);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be allowed again
            result = await cacheService.checkRateLimit(key, limit, window);
            expect(result.allowed).toBe(true);
        });
    });

    describe('TTL management', () => {
        it('should respect default TTL for different data types', async () => {
            // Test with BoL status (5 minutes default)
            await cacheService.set('bol:123:status', 'approved', {
                type: 'bolStatus'
            });

            // Test with user session (1 hour default)
            await cacheService.set('session:456', 'session_data', {
                type: 'userSession'
            });

            // Both should be set successfully
            const bolStatus = await cacheService.get('bol:123:status');
            const session = await cacheService.get('session:456');

            expect(bolStatus).toBe('approved');
            expect(session).toBe('session_data');
        });

        it('should handle custom TTL override', async () => {
            const key = 'custom_ttl_test';
            const value = 'custom_value';
            const customTtl = 30; // 30 seconds

            await cacheService.set(key, value, { ttl: customTtl });
            const result = await cacheService.get(key);

            expect(result).toBe(value);
        });
    });

    describe('performance monitoring', () => {
        it('should track cache performance metrics', async () => {
            const initialOperations = cacheService.metrics.totalOperations;

            await cacheService.set('perf_test', 'value');
            await cacheService.get('perf_test');
            await cacheService.get('non_existent');

            expect(cacheService.metrics.totalOperations).toBeGreaterThan(initialOperations);
            expect(cacheService.metrics.hits).toBeGreaterThan(0);
            expect(cacheService.metrics.misses).toBeGreaterThan(0);
        });

        it('should calculate average response time', async () => {
            await cacheService.set('response_time_test', 'value');
            await cacheService.get('response_time_test');

            expect(cacheService.metrics.avgResponseTime).toBeGreaterThan(0);
        });

        it('should return comprehensive metrics', async () => {
            const metrics = cacheService.getMetrics();

            expect(metrics).toHaveProperty('hits');
            expect(metrics).toHaveProperty('misses');
            expect(metrics).toHaveProperty('hitRatio');
            expect(metrics).toHaveProperty('totalOperations');
            expect(metrics).toHaveProperty('avgResponseTime');
            expect(metrics).toHaveProperty('memoryUsage');
            expect(metrics).toHaveProperty('connectionStatus');
        });

        it('should calculate hit ratio correctly', async () => {
            // Reset metrics for clean calculation
            cacheService.metrics.hits = 0;
            cacheService.metrics.misses = 0;

            await cacheService.set('ratio_test', 'value');
            await cacheService.get('ratio_test'); // Hit
            await cacheService.get('non_existent'); // Miss

            const metrics = cacheService.getMetrics();
            expect(metrics.hitRatio).toBe(0.5); // 1 hit, 1 miss = 50%
        });
    });

    describe('error handling', () => {
        it('should handle connection errors gracefully', async () => {
            // Simulate connection error by mocking client failure
            const originalClient = cacheService.client;
            cacheService.client = {
                get: jest.fn().mockRejectedValue(new Error('Connection failed')),
                set: jest.fn().mockRejectedValue(new Error('Connection failed'))
            };

            // Operations should not throw but handle gracefully
            const result = await cacheService.get('error_test');
            expect(result).toBeNull();

            const setResult = await cacheService.set('error_test', 'value');
            expect(setResult).toBe(false);

            // Restore original client
            cacheService.client = originalClient;
        });

        it('should track error metrics', async () => {
            const initialErrors = cacheService.metrics.errors;

            // Force an error by using invalid client
            const originalClient = cacheService.client;
            cacheService.client = {
                get: jest.fn().mockRejectedValue(new Error('Test error'))
            };

            await cacheService.get('error_metric_test');

            expect(cacheService.metrics.errors).toBe(initialErrors + 1);

            // Restore client
            cacheService.client = originalClient;
        });
    });

    describe('health checks', () => {
        it('should return healthy status', async () => {
            const health = await cacheService.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.metrics).toBeDefined();
            expect(health.timestamp).toBeDefined();
        });

        it('should return unhealthy status on connection failure', async () => {
            // Mock ping failure
            const originalClient = cacheService.client;
            cacheService.client = {
                ping: jest.fn().mockRejectedValue(new Error('Connection failed'))
            };

            const health = await cacheService.healthCheck();

            expect(health.status).toBe('unhealthy');
            expect(health.error).toContain('Connection failed');

            // Restore client
            cacheService.client = originalClient;
        });

        it('should include performance metrics in health check', async () => {
            const health = await cacheService.healthCheck();

            expect(health.metrics).toHaveProperty('hitRatio');
            expect(health.metrics).toHaveProperty('totalOperations');
            expect(health.metrics).toHaveProperty('avgResponseTime');
        });
    });

    describe('bulk operations', () => {
        it('should handle bulk set operations', async () => {
            const data = {
                'bulk:key1': 'value1',
                'bulk:key2': 'value2',
                'bulk:key3': 'value3'
            };

            await cacheService.setBulk(data);

            const results = await Promise.all([
                cacheService.get('bulk:key1'),
                cacheService.get('bulk:key2'),
                cacheService.get('bulk:key3')
            ]);

            expect(results).toEqual(['value1', 'value2', 'value3']);
        });

        it('should handle bulk get operations', async () => {
            await cacheService.set('bulk_get:1', 'value1');
            await cacheService.set('bulk_get:2', 'value2');
            await cacheService.set('bulk_get:3', 'value3');

            const keys = ['bulk_get:1', 'bulk_get:2', 'bulk_get:3', 'non_existent'];
            const results = await cacheService.getBulk(keys);

            expect(results).toEqual([
                'value1',
                'value2',
                'value3',
                null
            ]);
        });
    });

    describe('memory management', () => {
        it('should flush all cache data', async () => {
            await cacheService.set('flush:key1', 'value1');
            await cacheService.set('flush:key2', 'value2');

            await cacheService.flushAll();

            const result1 = await cacheService.get('flush:key1');
            const result2 = await cacheService.get('flush:key2');

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });

        it('should monitor memory usage', async () => {
            const metrics = cacheService.getMetrics();
            expect(typeof metrics.memoryUsage).toBe('object');
            expect(metrics.memoryUsage).toHaveProperty('used');
            expect(metrics.memoryUsage).toHaveProperty('total');
        });
    });
});