/**
 * Jest test setup file
 * Configures the test environment for LoadBlock backend tests
 */

require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loadblock_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock logger for tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  request: (req, res, next) => next && next(),
  child: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Global test helpers
global.TEST_TIMEOUT = 10000;

// Setup and teardown helpers
beforeAll(async () => {
  // Database setup could be added here
});

afterAll(async () => {
  // Cleanup could be added here
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});