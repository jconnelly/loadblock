'use strict';

const logger = require('./logger');

describe('Logger', () => {
    let consoleLogSpy, consoleErrorSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('Basic logging', () => {
        it('should log info messages', () => {
            logger.info('Test info message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log error messages', () => {
            logger.error('Test error message');
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should log with metadata', () => {
            const metadata = { userId: '123', action: 'test' };
            logger.info('Test message with metadata', metadata);
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log warn messages', () => {
            logger.warn('Test warning message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log debug messages', () => {
            logger.debug('Test debug message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('Request middleware', () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                headers: {
                    'user-agent': 'test-agent'
                }
            };
            res = {
                statusCode: 200,
                on: jest.fn()
            };
            next = jest.fn();
        });

        it('should create request middleware', () => {
            const middleware = logger.request;
            expect(typeof middleware).toBe('function');
        });

        it('should log request details', () => {
            const middleware = logger.request;
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle request completion', () => {
            const middleware = logger.request;
            middleware(req, res, next);

            // Simulate response finish
            const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
            if (finishCallback) {
                finishCallback();
            }

            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('Error logging', () => {
        it('should log Error objects properly', () => {
            const error = new Error('Test error');
            error.stack = 'Error stack trace';

            logger.error('Error occurred', { error: error.message, stack: error.stack });
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle nested objects in metadata', () => {
            const complexMetadata = {
                user: {
                    id: '123',
                    email: 'test@example.com'
                },
                request: {
                    method: 'POST',
                    path: '/api/test'
                }
            };

            logger.info('Complex metadata test', complexMetadata);
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('Environment handling', () => {
        const originalNodeEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should handle production environment', () => {
            process.env.NODE_ENV = 'production';
            logger.info('Production log test');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle test environment', () => {
            process.env.NODE_ENV = 'test';
            logger.info('Test environment log');
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });
});