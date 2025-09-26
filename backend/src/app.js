const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const logger = require('./utils/logger');
const { testConnection } = require('./config/database');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const validation = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const bolRoutes = require('./routes/bol');
const adminRoutes = require('./routes/admin');

/**
 * Create and configure Express application
 */
const createApp = () => {
  const app = express();

  // Trust proxy (for deployment behind load balancer)
  app.set('trust proxy', 1);

  // Request ID middleware (for tracking requests)
  app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More restrictive in production
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    }
  });

  app.use('/api/v1/auth', authLimiter);
  app.use('/api', limiter);

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200 // Support legacy browsers
  }));

  // Compression middleware
  app.use(compression());

  // Cookie parsing middleware
  app.use(cookieParser());

  // Body parsing middleware
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(logger.request);

  // Health check endpoint (before authentication)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', authMiddleware.authenticate, userRoutes);
  app.use('/api/v1/contacts', authMiddleware.authenticate, contactRoutes);
  app.use('/api/v1/bol', authMiddleware.authenticate, bolRoutes);
  app.use('/api/v1/admin', authMiddleware.authenticate, authMiddleware.requireRole(['admin']), adminRoutes);

  // API documentation endpoint
  app.get('/api/v1', (req, res) => {
    res.json({
      name: 'LoadBlock API',
      version: '1.0.0',
      description: 'Blockchain-based Bill of Lading management system',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        contacts: '/api/v1/contacts',
        bol: '/api/v1/bol',
        admin: '/api/v1/admin'
      },
      documentation: '/api/docs'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Start the server
 */
const startServer = async (port = process.env.PORT || 3001) => {
  try {
    // Test database connection
    await testConnection();

    const app = createApp();

    const server = app.listen(port, () => {
      logger.info(`LoadBlock API server started`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown', err);
          process.exit(1);
        }
        logger.info('Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};