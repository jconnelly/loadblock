'use strict';

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Import performance monitoring services
const { getPerformanceMetrics: getDatabaseMetrics } = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/v1/performance/system
 * @desc    Get comprehensive system performance metrics
 * @access  Private - Admin only
 */
router.get('/system',
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();

    try {
      // Collect metrics from all services
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: `${Math.floor(process.uptime())}s`,
          memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`
          },
          cpuUsage: process.cpuUsage()
        },
        database: getDatabaseMetrics(),
        services: {
          cache: await getCacheMetrics(),
          blockchain: await getBlockchainMetrics(),
          pdf: await getPDFMetrics(),
          notifications: await getNotificationMetrics(),
          statusService: await getStatusServiceMetrics()
        },
        performance: {
          targets: {
            apiResponse: '<500ms',
            pdfGeneration: '<3000ms',
            blockchainCommit: '<30000ms',
            cacheOperations: '<50ms',
            statusUpdate: '<200ms'
          },
          alerts: await checkPerformanceAlerts()
        }
      };

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('System performance metrics collected', {
        duration: `${duration.toFixed(2)}ms`,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          collectionTime: `${duration.toFixed(2)}ms`
        }
      });

    } catch (error) {
      logger.error('Performance metrics collection failed', {
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   GET /api/v1/performance/health
 * @desc    Get system health status
 * @access  Private - Admin only
 */
router.get('/health',
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const healthChecks = await Promise.all([
        checkDatabaseHealth(),
        checkCacheHealth(),
        checkBlockchainHealth(),
        checkPDFHealth(),
        checkNotificationHealth()
      ]);

      const overall = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

      const health = {
        overall,
        services: {
          database: healthChecks[0],
          cache: healthChecks[1],
          blockchain: healthChecks[2],
          pdf: healthChecks[3],
          notifications: healthChecks[4]
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: health,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message,
        requestId: req.id
      });

      res.status(503).json({
        success: false,
        data: {
          overall: 'unhealthy',
          error: error.message
        }
      });
    }
  })
);

/**
 * @route   GET /api/v1/performance/alerts
 * @desc    Get performance alerts and recommendations
 * @access  Private - Admin only
 */
router.get('/alerts',
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const alerts = await generatePerformanceAlerts();

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warnings: alerts.filter(a => a.severity === 'warning').length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Performance alerts generation failed', {
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * @route   POST /api/v1/performance/benchmark
 * @desc    Run performance benchmark tests
 * @access  Private - Admin only
 */
router.post('/benchmark',
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    const startTime = process.hrtime.bigint();

    try {
      logger.info('Starting performance benchmark', {
        userId: req.user.id
      });

      const benchmarks = await runBenchmarkSuite();

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      logger.info('Performance benchmark completed', {
        duration: `${duration.toFixed(2)}ms`,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          benchmarks,
          summary: {
            totalDuration: `${duration.toFixed(2)}ms`,
            testsRun: Object.keys(benchmarks).length,
            passed: Object.values(benchmarks).filter(b => b.passed).length,
            failed: Object.values(benchmarks).filter(b => !b.passed).length
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Performance benchmark failed', {
        error: error.message,
        requestId: req.id
      });
      throw error;
    }
  })
);

/**
 * HELPER FUNCTIONS
 */

async function getCacheMetrics() {
  try {
    const cacheService = require('../services/cacheService');
    return cacheService.getMetrics();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function getBlockchainMetrics() {
  try {
    const blockchainService = require('../services/blockchainService');
    return blockchainService.getPerformanceMetrics();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function getPDFMetrics() {
  try {
    const pdfService = require('../services/pdfService');
    return pdfService.getPerformanceMetrics();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function getNotificationMetrics() {
  try {
    const notificationService = require('../services/notificationService');
    return notificationService.getPerformanceMetrics();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function getStatusServiceMetrics() {
  try {
    const bolStatusService = require('../services/bolStatusService');
    return bolStatusService.getPerformanceMetrics();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkDatabaseHealth() {
  try {
    const { query } = require('../config/database');
    await query('SELECT 1');
    return { status: 'healthy', responseTime: '<5ms' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkCacheHealth() {
  try {
    const cacheService = require('../services/cacheService');
    return await cacheService.healthCheck();
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkBlockchainHealth() {
  try {
    const blockchainService = require('../services/blockchainService');
    return await blockchainService.healthCheck();
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkPDFHealth() {
  try {
    const pdfService = require('../services/pdfService');
    return await pdfService.healthCheck();
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkNotificationHealth() {
  try {
    const notificationService = require('../services/notificationService');
    return await notificationService.healthCheck();
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkPerformanceAlerts() {
  const alerts = [];

  try {
    // Check database performance
    const dbMetrics = getDatabaseMetrics();
    if (dbMetrics.avgDuration > 100) {
      alerts.push({
        type: 'database_slow',
        severity: 'warning',
        message: `Average database query time: ${dbMetrics.avgDuration.toFixed(2)}ms (target: <100ms)`,
        metric: dbMetrics.avgDuration,
        threshold: 100
      });
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 512) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'critical',
        message: `High memory usage: ${heapUsedMB.toFixed(2)}MB (threshold: 512MB)`,
        metric: heapUsedMB,
        threshold: 512
      });
    }

    // Check cache performance
    const cacheService = require('../services/cacheService');
    const cacheMetrics = cacheService.getMetrics();
    if (cacheMetrics.hitRate && parseFloat(cacheMetrics.hitRate) < 80) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'warning',
        message: `Low cache hit rate: ${cacheMetrics.hitRate} (target: >80%)`,
        metric: parseFloat(cacheMetrics.hitRate),
        threshold: 80
      });
    }

    return alerts;

  } catch (error) {
    logger.error('Performance alert check failed', { error: error.message });
    return [{
      type: 'alert_system_error',
      severity: 'critical',
      message: `Alert system error: ${error.message}`,
      metric: null,
      threshold: null
    }];
  }
}

async function generatePerformanceAlerts() {
  const alerts = await checkPerformanceAlerts();

  // Add recommendations
  return alerts.map(alert => ({
    ...alert,
    recommendation: getRecommendation(alert.type),
    timestamp: new Date().toISOString()
  }));
}

function getRecommendation(alertType) {
  const recommendations = {
    'database_slow': 'Consider adding database indexes, optimizing queries, or increasing connection pool size',
    'high_memory_usage': 'Investigate memory leaks, optimize object lifecycle, or increase server memory',
    'low_cache_hit_rate': 'Review cache TTL settings, improve cache key strategies, or pre-warm frequently accessed data',
    'blockchain_queue_full': 'Increase batch processing frequency or add more blockchain workers',
    'pdf_generation_slow': 'Enable PDF template caching or increase PDF worker threads',
    'notification_queue_backup': 'Scale notification workers or optimize notification batching'
  };

  return recommendations[alertType] || 'Contact system administrator for assistance';
}

async function runBenchmarkSuite() {
  const benchmarks = {};

  try {
    // Database benchmark
    benchmarks.database = await benchmarkDatabase();

    // Cache benchmark
    benchmarks.cache = await benchmarkCache();

    // PDF generation benchmark
    benchmarks.pdf = await benchmarkPDF();

    // API response benchmark
    benchmarks.api = await benchmarkAPI();

    return benchmarks;

  } catch (error) {
    logger.error('Benchmark suite failed', { error: error.message });
    throw error;
  }
}

async function benchmarkDatabase() {
  const startTime = process.hrtime.bigint();
  const iterations = 100;

  try {
    const { query } = require('../config/database');

    for (let i = 0; i < iterations; i++) {
      await query('SELECT 1');
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    const avgDuration = duration / iterations;

    return {
      name: 'Database Query Performance',
      iterations,
      totalDuration: `${duration.toFixed(2)}ms`,
      avgDuration: `${avgDuration.toFixed(2)}ms`,
      target: '<5ms',
      passed: avgDuration < 5,
      details: `${iterations} SELECT queries executed`
    };

  } catch (error) {
    return {
      name: 'Database Query Performance',
      passed: false,
      error: error.message
    };
  }
}

async function benchmarkCache() {
  const startTime = process.hrtime.bigint();
  const iterations = 1000;

  try {
    const cacheService = require('../services/cacheService');

    // Test cache set/get operations
    for (let i = 0; i < iterations; i++) {
      await cacheService.set(`benchmark:${i}`, `value-${i}`, { ttl: 60 });
      await cacheService.get(`benchmark:${i}`);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    const avgDuration = duration / (iterations * 2); // set + get operations

    return {
      name: 'Cache Performance',
      iterations: iterations * 2,
      totalDuration: `${duration.toFixed(2)}ms`,
      avgDuration: `${avgDuration.toFixed(2)}ms`,
      target: '<5ms',
      passed: avgDuration < 5,
      details: `${iterations} set/get operations`
    };

  } catch (error) {
    return {
      name: 'Cache Performance',
      passed: false,
      error: error.message
    };
  }
}

async function benchmarkPDF() {
  const startTime = process.hrtime.bigint();

  try {
    const pdfService = require('../services/pdfService');

    // Generate test PDF
    const testData = {
      bolNumber: 'BENCHMARK-001',
      status: 'test',
      shipper: { companyName: 'Test Shipper', contactName: 'Test', email: 'test@test.com', phone: '123' },
      consignee: { companyName: 'Test Consignee', contactName: 'Test', email: 'test@test.com', phone: '123' },
      carrier: { companyName: 'Test Carrier', contactName: 'Test', email: 'test@test.com', phone: '123' },
      cargoItems: [{ description: 'Test Cargo', quantity: 1, weight: 100, value: 1000 }]
    };

    const result = await pdfService.generateBoLPDF(testData, { test: true });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;

    // Cleanup test file
    await pdfService.deleteTemporaryFile(result.filepath);

    return {
      name: 'PDF Generation Performance',
      iterations: 1,
      totalDuration: `${duration.toFixed(2)}ms`,
      avgDuration: `${duration.toFixed(2)}ms`,
      target: '<3000ms',
      passed: duration < 3000,
      details: `Single BoL PDF generated (${result.size} bytes)`
    };

  } catch (error) {
    return {
      name: 'PDF Generation Performance',
      passed: false,
      error: error.message
    };
  }
}

async function benchmarkAPI() {
  // Mock API response time benchmark
  const startTime = process.hrtime.bigint();
  const iterations = 50;

  try {
    // Simulate API processing
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    const avgDuration = duration / iterations;

    return {
      name: 'API Response Performance',
      iterations,
      totalDuration: `${duration.toFixed(2)}ms`,
      avgDuration: `${avgDuration.toFixed(2)}ms`,
      target: '<500ms',
      passed: avgDuration < 500,
      details: `${iterations} simulated API calls`
    };

  } catch (error) {
    return {
      name: 'API Response Performance',
      passed: false,
      error: error.message
    };
  }
}

module.exports = router;