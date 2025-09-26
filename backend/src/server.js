/**
 * LoadBlock Backend Server Entry Point
 * This file loads environment variables and starts the server
 */

require('dotenv').config();
const { startServer } = require('./app');
const logger = require('./utils/logger');

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', {
    missing: missingEnvVars
  });
  process.exit(1);
}

// Create logs directory
const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start the server
const port = process.env.PORT || 3001;
startServer(port);

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', { reason, promise });
  process.exit(1);
});