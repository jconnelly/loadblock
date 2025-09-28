const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'loadblock-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: []
});

// Add console transport for development and test
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    silent: process.env.NODE_ENV === 'test' // Silent in test unless LOG_LEVEL is set
  }));
} else {
  // Production console logging (structured JSON)
  logger.add(new winston.transports.Console({
    format: logFormat
  }));
}

// Add file transports
logger.add(new winston.transports.File({
  filename: path.join(process.cwd(), 'logs', 'error.log'),
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
}));

logger.add(new winston.transports.File({
  filename: path.join(process.cwd(), 'logs', 'combined.log'),
  maxsize: 5242880, // 5MB
  maxFiles: 5,
}));

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'exceptions.log')
  })
);

process.on('unhandledRejection', (ex) => {
  throw ex;
});

// Helper function to create child logger with additional context
logger.child = (meta) => {
  return logger.child(meta);
};

// Request logging helper
logger.request = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      requestId: req.id
    });
  });

  if (next) next();
};

// Error logging helper
logger.error = (message, error, meta = {}) => {
  const errorInfo = {
    message: error?.message,
    stack: error?.stack,
    code: error?.code,
    ...meta
  };

  winston.Logger.prototype.error.call(logger, message, errorInfo);
};

module.exports = logger;