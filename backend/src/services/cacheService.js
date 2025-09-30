'use strict';

// Mock Redis client for development (replace with actual Redis in production)
const mockRedisClient = {
    get: async (key) => null,
    set: async (key, value) => 'OK',
    setex: async (key, ttl, value) => 'OK',
    del: async (key) => 1,
    exists: async (key) => 0,
    keys: async (pattern) => [],
    flushall: async () => 'OK',
    quit: async () => 'OK',
    on: (event, callback) => {},
    ping: async () => 'PONG'
};

const logger = require('../utils/logger');

/**
 * High-Performance Redis Caching Service
 * Optimized for LoadBlock status workflow operations
 * Target: <50ms cache operations for sub-500ms API response times
 */
class CacheService {
    constructor() {
        // Redis cluster configuration for enterprise performance
        this.redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0,

            // Performance optimizations
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            commandTimeout: 1000, // 1-second timeout for fast operations

            // Connection pool settings
            connectTimeout: 2000,
            maxConcurrentCommands: 1000,

            // Memory optimization
            maxMemoryPolicy: 'allkeys-lru'
        };

        this.client = null;
        this.isConnected = false;

        // Performance metrics
        this.metrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            avgResponseTime: 0,
            totalOperations: 0
        };

        // Cache TTL configurations for different data types
        this.ttlConfig = {
            bolStatus: 300,        // 5 minutes - frequently updated
            userSession: 3600,     // 1 hour - authentication data
            permissions: 1800,     // 30 minutes - role-based permissions
            analytics: 7200,       // 2 hours - aggregated data
            staticData: 86400,     // 24 hours - reference data
            temporary: 60          // 1 minute - temporary locks/flags
        };

        this.initializeClient();
    }

    /**
     * Initialize Redis client with error handling
     */
    async initializeClient() {
        try {
            this.client = mockRedisClient;

            this.client.on('connect', () => {
                logger.info('Redis cache connected successfully');
                this.isConnected = true;
            });

            this.client.on('error', (error) => {
                logger.error('Redis cache error', { error: error.message });
                this.metrics.errors++;
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                logger.info('Redis cache reconnecting...');
            });

            await this.client.connect();

        } catch (error) {
            logger.error('Failed to initialize Redis cache', { error: error.message });
            this.isConnected = false;
        }
    }

    /**
     * High-performance get operation with metrics
     * Target: <10ms response time
     */
    async get(key, options = {}) {
        const start = process.hrtime.bigint();

        try {
            if (!this.isConnected) {
                this.metrics.misses++;
                return null;
            }

            const result = await this.client.get(key);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - start) / 1000000; // Convert to milliseconds

            this.updateMetrics(duration, result !== null);

            if (result !== null) {
                logger.debug('Cache hit', { key, duration: `${duration.toFixed(2)}ms` });

                // Parse JSON if specified
                if (options.parseJson && result) {
                    return JSON.parse(result);
                }

                return result;
            } else {
                logger.debug('Cache miss', { key, duration: `${duration.toFixed(2)}ms` });
                return null;
            }

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - start) / 1000000;

            logger.error('Cache get failed', {
                key,
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });

            this.metrics.errors++;
            return null;
        }
    }

    /**
     * High-performance set operation with TTL optimization
     * Target: <10ms response time
     */
    async set(key, value, options = {}) {
        const start = process.hrtime.bigint();

        try {
            if (!this.isConnected) {
                return false;
            }

            // Determine TTL
            const ttl = options.ttl || this.getTTLForKey(key) || this.ttlConfig.temporary;

            // Serialize value if object
            const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;

            // Set with TTL
            await this.client.setEx(key, ttl, serializedValue);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - start) / 1000000;

            logger.debug('Cache set', {
                key,
                ttl,
                duration: `${duration.toFixed(2)}ms`
            });

            return true;

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - start) / 1000000;

            logger.error('Cache set failed', {
                key,
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });

            this.metrics.errors++;
            return false;
        }
    }

    /**
     * Multi-get operation for batch retrieval
     * Target: <20ms for 10 keys
     */
    async mget(keys, options = {}) {
        const start = process.hrtime.bigint();

        try {
            if (!this.isConnected || keys.length === 0) {
                return {};
            }

            const results = await this.client.mGet(keys);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - start) / 1000000;

            const resultMap = {};
            let hits = 0;

            keys.forEach((key, index) => {
                const value = results[index];
                if (value !== null) {
                    resultMap[key] = options.parseJson ? JSON.parse(value) : value;
                    hits++;
                }
            });

            // Update metrics
            this.metrics.hits += hits;
            this.metrics.misses += (keys.length - hits);
            this.updateAverageResponseTime(duration);

            logger.debug('Cache mget', {
                requestedKeys: keys.length,
                hits,
                misses: keys.length - hits,
                duration: `${duration.toFixed(2)}ms`
            });

            return resultMap;

        } catch (error) {
            logger.error('Cache mget failed', {
                keys: keys.slice(0, 5), // Log first 5 keys only
                error: error.message
            });

            this.metrics.errors++;
            return {};
        }
    }

    /**
     * Specialized BoL status caching
     */
    async setBolStatus(bolId, statusData, version) {
        const key = `bol:${bolId}:status`;
        const cacheData = {
            ...statusData,
            version,
            cachedAt: Date.now()
        };

        return this.set(key, cacheData, { ttl: this.ttlConfig.bolStatus });
    }

    async getBolStatus(bolId) {
        const key = `bol:${bolId}:status`;
        return this.get(key, { parseJson: true });
    }

    /**
     * User session caching for fast authentication
     */
    async setUserSession(userId, sessionData) {
        const key = `session:${userId}`;
        return this.set(key, sessionData, { ttl: this.ttlConfig.userSession });
    }

    async getUserSession(userId) {
        const key = `session:${userId}`;
        return this.get(key, { parseJson: true });
    }

    /**
     * Permission caching for role-based access
     */
    async setUserPermissions(userId, bolId, permissions) {
        const key = `permissions:${userId}:${bolId}`;
        return this.set(key, permissions, { ttl: this.ttlConfig.permissions });
    }

    async getUserPermissions(userId, bolId) {
        const key = `permissions:${userId}:${bolId}`;
        return this.get(key, { parseJson: true });
    }

    /**
     * Bulk invalidation for related keys
     */
    async invalidatePattern(pattern) {
        try {
            if (!this.isConnected) {
                return false;
            }

            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.debug('Cache invalidation', { pattern, keysInvalidated: keys.length });
            }

            return true;

        } catch (error) {
            logger.error('Cache invalidation failed', {
                pattern,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Invalidate BoL-related caches on status update
     */
    async invalidateBolCaches(bolId) {
        await Promise.all([
            this.invalidatePattern(`bol:${bolId}:*`),
            this.invalidatePattern(`permissions:*:${bolId}`),
            this.invalidatePattern(`analytics:bol:${bolId}:*`)
        ]);
    }

    /**
     * Queue operations for async processing
     */
    async pushToQueue(queueName, item, priority = 'normal') {
        const key = `queue:${queueName}:${priority}`;
        const serializedItem = JSON.stringify({
            ...item,
            enqueuedAt: Date.now(),
            priority
        });

        try {
            if (priority === 'high') {
                await this.client.lPush(key, serializedItem);
            } else {
                await this.client.rPush(key, serializedItem);
            }

            logger.debug('Item queued', { queueName, priority });
            return true;

        } catch (error) {
            logger.error('Queue push failed', {
                queueName,
                priority,
                error: error.message
            });
            return false;
        }
    }

    async popFromQueue(queueName, priority = 'normal') {
        const key = `queue:${queueName}:${priority}`;

        try {
            const item = await this.client.lPop(key);
            if (item) {
                return JSON.parse(item);
            }
            return null;

        } catch (error) {
            logger.error('Queue pop failed', {
                queueName,
                priority,
                error: error.message
            });
            return null;
        }
    }

    async getQueueLength(queueName, priority = 'normal') {
        const key = `queue:${queueName}:${priority}`;
        try {
            return await this.client.lLen(key);
        } catch (error) {
            logger.error('Queue length check failed', { queueName, priority });
            return 0;
        }
    }

    /**
     * Rate limiting implementation
     */
    async checkRateLimit(identifier, limit, windowSeconds) {
        const key = `ratelimit:${identifier}`;

        try {
            const current = await this.client.incr(key);

            if (current === 1) {
                await this.client.expire(key, windowSeconds);
            }

            return {
                allowed: current <= limit,
                current,
                limit,
                remaining: Math.max(0, limit - current),
                resetTime: Math.floor(Date.now() / 1000) + windowSeconds
            };

        } catch (error) {
            logger.error('Rate limit check failed', { identifier, error: error.message });
            return { allowed: true, current: 0, limit, remaining: limit };
        }
    }

    /**
     * Distributed locking for concurrent operations
     */
    async acquireLock(resource, ttlSeconds = 30) {
        const key = `lock:${resource}`;
        const identifier = `${Date.now()}-${Math.random()}`;

        try {
            const result = await this.client.set(key, identifier, {
                EX: ttlSeconds,
                NX: true
            });

            if (result === 'OK') {
                return { acquired: true, identifier };
            }

            return { acquired: false, identifier: null };

        } catch (error) {
            logger.error('Lock acquisition failed', { resource, error: error.message });
            return { acquired: false, identifier: null };
        }
    }

    async releaseLock(resource, identifier) {
        const key = `lock:${resource}`;

        try {
            // Lua script for atomic check-and-delete
            const luaScript = `
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end
            `;

            const result = await this.client.eval(luaScript, 1, key, identifier);
            return result === 1;

        } catch (error) {
            logger.error('Lock release failed', { resource, error: error.message });
            return false;
        }
    }

    /**
     * Utility methods
     */
    getTTLForKey(key) {
        if (key.includes(':status')) return this.ttlConfig.bolStatus;
        if (key.includes(':session')) return this.ttlConfig.userSession;
        if (key.includes(':permissions')) return this.ttlConfig.permissions;
        if (key.includes(':analytics')) return this.ttlConfig.analytics;
        if (key.includes(':static')) return this.ttlConfig.staticData;
        return this.ttlConfig.temporary;
    }

    updateMetrics(duration, isHit) {
        this.metrics.totalOperations++;

        if (isHit) {
            this.metrics.hits++;
        } else {
            this.metrics.misses++;
        }

        this.updateAverageResponseTime(duration);
    }

    updateAverageResponseTime(duration) {
        this.metrics.avgResponseTime = (
            (this.metrics.avgResponseTime * (this.metrics.totalOperations - 1)) + duration
        ) / this.metrics.totalOperations;
    }

    /**
     * Performance monitoring
     */
    getMetrics() {
        const hitRate = this.metrics.totalOperations > 0 ?
            (this.metrics.hits / this.metrics.totalOperations * 100).toFixed(2) : 0;

        return {
            ...this.metrics,
            hitRate: `${hitRate}%`,
            avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
            isConnected: this.isConnected
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'unhealthy', reason: 'Not connected' };
            }

            const start = Date.now();
            await this.client.ping();
            const pingTime = Date.now() - start;

            return {
                status: 'healthy',
                pingTime: `${pingTime}ms`,
                metrics: this.getMetrics()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                reason: error.message
            };
        }
    }

    /**
     * Graceful shutdown
     */
    async close() {
        try {
            if (this.client) {
                await this.client.quit();
                logger.info('Redis cache connection closed');
            }
        } catch (error) {
            logger.error('Error closing Redis cache connection', { error: error.message });
        }
    }
}

module.exports = new CacheService();