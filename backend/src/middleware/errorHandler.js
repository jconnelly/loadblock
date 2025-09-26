const logger = require('../utils/logger');

/**
 * Custom error classes for better error handling
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', details = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Error handler middleware
 * Processes all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error properties
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = null;

  // Handle different error types
  if (err.isOperational) {
    // Custom application errors
    statusCode = err.statusCode;
    errorCode = err.code || 'APPLICATION_ERROR';
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Mongoose/Joi validation errors
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = formatValidationErrors(err);
  } else if (err.name === 'CastError') {
    // MongoDB cast errors (invalid ObjectId, etc.)
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = 'Invalid ID format';
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
    details = formatPostgresError(err);
  } else if (err.code === '23503') {
    // PostgreSQL foreign key constraint violation
    statusCode = 400;
    errorCode = 'INVALID_REFERENCE';
    message = 'Referenced resource does not exist';
  } else if (err.code === '23502') {
    // PostgreSQL not null constraint violation
    statusCode = 400;
    errorCode = 'MISSING_REQUIRED_FIELD';
    message = 'Required field is missing';
    details = formatPostgresError(err);
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.type === 'entity.parse.failed') {
    // JSON parse errors
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else if (err.type === 'entity.too.large') {
    // Request too large
    statusCode = 413;
    errorCode = 'REQUEST_TOO_LARGE';
    message = 'Request payload too large';
  } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    // Network/connection errors
    statusCode = 502;
    errorCode = 'EXTERNAL_SERVICE_ERROR';
    message = 'External service unavailable';
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  const logMessage = `${req.method} ${req.originalUrl} - ${message}`;

  const logData = {
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles
      } : undefined
    },
    requestId: req.id
  };

  logger[logLevel](logMessage, logData);

  // Send error response
  const errorResponse = {
    success: false,
    error: {
      message,
      code: errorCode
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  };

  // Add details in development or for validation errors
  if (details && (process.env.NODE_ENV !== 'production' || statusCode === 400)) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Format validation errors for client consumption
 */
const formatValidationErrors = (err) => {
  const errors = {};

  if (err.errors) {
    Object.keys(err.errors).forEach(key => {
      errors[key] = err.errors[key].message;
    });
  }

  return errors;
};

/**
 * Format PostgreSQL errors for client consumption
 */
const formatPostgresError = (err) => {
  const details = {};

  if (err.constraint) {
    details.constraint = err.constraint;
  }

  if (err.column) {
    details.column = err.column;
  }

  if (err.table) {
    details.table = err.table;
  }

  return Object.keys(details).length > 0 ? details : null;
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for routes that don't exist
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      details: {
        method: req.method,
        path: req.originalUrl
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError
};