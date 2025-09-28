'use strict';

const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');

// Mock the database connection
jest.mock('../config/database', () => ({
    query: jest.fn()
}));

const { query } = require('../config/database');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        const validPayload = {
            id: '1',
            email: 'test@example.com',
            roles: ['carrier']
        };

        const validToken = jwt.sign(
            validPayload,
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        it('should verify valid token and set user', async () => {
            req.headers.authorization = `Bearer ${validToken}`;

            // Mock user found in database
            query.mockResolvedValue({
                rows: [{
                    id: '1',
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User',
                    roles: ['carrier'],
                    is_active: true
                }]
            });

            await authMiddleware.verifyToken(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.email).toBe('test@example.com');
            expect(next).toHaveBeenCalled();
        });

        it('should return 401 for missing token', async () => {
            await authMiddleware.verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Access token required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid token', async () => {
            req.headers.authorization = 'Bearer invalid-token';

            await authMiddleware.verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired token'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for user not found in database', async () => {
            req.headers.authorization = `Bearer ${validToken}`;

            // Mock user not found
            query.mockResolvedValue({ rows: [] });

            await authMiddleware.verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'User not found'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for inactive user', async () => {
            req.headers.authorization = `Bearer ${validToken}`;

            // Mock inactive user
            query.mockResolvedValue({
                rows: [{
                    id: '1',
                    email: 'test@example.com',
                    is_active: false
                }]
            });

            await authMiddleware.verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'User account is deactivated'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('requireRoles', () => {
        beforeEach(() => {
            req.user = {
                id: '1',
                email: 'test@example.com',
                roles: ['carrier', 'shipper']
            };
        });

        it('should allow access for user with required role', () => {
            const middleware = authMiddleware.requireRoles(['carrier']);

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow access for admin user regardless of required roles', () => {
            req.user.roles = ['admin'];
            const middleware = authMiddleware.requireRoles(['carrier']);

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should deny access for user without required role', () => {
            req.user.roles = ['consignee'];
            const middleware = authMiddleware.requireRoles(['carrier', 'shipper']);

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Insufficient permissions'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should deny access for user with no roles', () => {
            req.user.roles = [];
            const middleware = authMiddleware.requireRoles(['carrier']);

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 if no user is set', () => {
            req.user = null;
            const middleware = authMiddleware.requireRoles(['carrier']);

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('authenticate (legacy)', () => {
        it('should call verifyToken', async () => {
            const spy = jest.spyOn(authMiddleware, 'verifyToken');

            await authMiddleware.authenticate(req, res, next);

            expect(spy).toHaveBeenCalledWith(req, res, next);
        });
    });

    describe('requireRole (legacy)', () => {
        it('should call requireRoles', () => {
            req.user = { roles: ['admin'] };
            const result = authMiddleware.requireRole(['admin']);

            expect(typeof result).toBe('function');
        });
    });
});