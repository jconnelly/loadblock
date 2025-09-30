const { Pool } = require('pg');
const logger = require('../utils/logger');

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
});

// High-performance database connection configuration for enterprise load
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Enterprise-grade connection pool settings
  max: 50, // Increased for high concurrency (status updates from multiple carriers)
  min: 10, // Maintain minimum connections for immediate availability
  acquireTimeoutMillis: 1000, // Fast fail for overloaded scenarios
  createTimeoutMillis: 2000, // Connection creation timeout
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  reapIntervalMillis: 1000, // Check for idle connections every second
  createRetryIntervalMillis: 200, // Retry failed connections quickly

  // Performance optimizations
  statement_timeout: 5000, // 5-second query timeout for predictable performance
  idle_in_transaction_session_timeout: 10000, // Prevent hanging transactions

  // Additional PostgreSQL-specific optimizations
  application_name: 'LoadBlock-StatusWorkflow',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connected successfully', {
      timestamp: result.rows[0].now,
      database: process.env.NODE_ENV || 'development'
    });
    client.release();
  } catch (err) {
    logger.error('Database connection failed', err);
    throw err;
  }
};

// Query performance tracking and optimization
const queryMetrics = {
  totalQueries: 0,
  totalDuration: 0,
  slowQueries: 0,
  avgDuration: 0
};

// Prepared statement cache for high-frequency queries
const preparedStatements = new Map();

// High-performance query helper with metrics and caching
const query = async (text, params = [], options = {}) => {
  const start = process.hrtime.bigint();
  const queryId = options.queryId || null;

  try {
    let result;

    // Use prepared statement if available and params provided
    if (queryId && preparedStatements.has(queryId)) {
      result = await pool.query(preparedStatements.get(queryId), params);
    } else {
      result = await pool.query(text, params);

      // Cache prepared statement for reuse
      if (queryId && params.length > 0) {
        preparedStatements.set(queryId, text);
      }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - start) / 1000000; // Convert to milliseconds

    // Update metrics
    queryMetrics.totalQueries++;
    queryMetrics.totalDuration += duration;
    queryMetrics.avgDuration = queryMetrics.totalDuration / queryMetrics.totalQueries;

    // Track slow queries (>100ms)
    if (duration > 100) {
      queryMetrics.slowQueries++;
      logger.warn('Slow query detected', {
        query: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
        duration: `${duration.toFixed(2)}ms`,
        rows: result.rowCount,
        queryId
      });
    } else {
      logger.debug('Query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration.toFixed(2)}ms`,
        rows: result.rowCount,
        queryId
      });
    }

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - start) / 1000000;

    logger.error('Query failed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params.length > 0 ? '[REDACTED]' : [],
      error: error.message,
      duration: `${duration.toFixed(2)}ms`,
      queryId
    });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Database performance monitoring
const getPerformanceMetrics = () => ({
  ...queryMetrics,
  connectionPool: {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount
  },
  preparedStatements: preparedStatements.size
});

// Optimized transaction with performance tracking
const performantTransaction = async (callback, options = {}) => {
  const start = process.hrtime.bigint();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set transaction-level optimizations
    if (options.readOnly) {
      await client.query('SET TRANSACTION READ ONLY');
    }

    if (options.isolationLevel) {
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }

    const result = await callback(client);
    await client.query('COMMIT');

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - start) / 1000000;

    logger.debug('Transaction completed', {
      duration: `${duration.toFixed(2)}ms`,
      readOnly: options.readOnly || false,
      isolationLevel: options.isolationLevel || 'default'
    });

    return result;
  } catch (error) {
    await client.query('ROLLBACK');

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - start) / 1000000;

    logger.error('Transaction failed', {
      error: error.message,
      duration: `${duration.toFixed(2)}ms`
    });

    throw error;
  } finally {
    client.release();
  }
};

// Bulk insert optimization for high-throughput operations
const bulkInsert = async (tableName, columns, data, options = {}) => {
  const batchSize = options.batchSize || 1000;
  const results = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const placeholders = batch.map((_, index) => {
      const rowPlaceholders = columns.map((_, colIndex) =>
        `$${index * columns.length + colIndex + 1}`
      ).join(', ');
      return `(${rowPlaceholders})`;
    }).join(', ');

    const values = batch.flat();
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

    const result = await query(query, values, { queryId: `bulk_insert_${tableName}` });
    results.push(result);
  }

  return results;
};

module.exports = {
  pool,
  query,
  transaction,
  performantTransaction,
  bulkInsert,
  testConnection,
  getPerformanceMetrics,
  queryMetrics,
  preparedStatements
};