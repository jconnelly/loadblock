'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const bcrypt = require('bcrypt');

// Mock the database connection
jest.mock('../config/database', () => ({
    testConnection: jest.fn().mockResolvedValue(true),
    query: jest.fn()
}));

const { query } = require('../config/database');

describe('Auth Controller', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                roles: ['shipper']
            };

            // Mock database responses
            query
                .mockResolvedValueOnce({ rows: [] }) // Check if user exists
                .mockResolvedValueOnce({
                    rows: [{
                        id: '1',
                        email: userData.email,
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        roles: userData.roles,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]
                }); // Insert user

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.token).toBeDefined();
        });

        it('should return error for existing user', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User'
            };

            // Mock user already exists
            query.mockResolvedValueOnce({
                rows: [{ id: '1', email: userData.email }]
            });

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',
                    password: '123' // Too short
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('POST /api/v1/auth/login', () => {
        const hashedPassword = bcrypt.hashSync('password123', 12);

        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            // Mock user found in database
            query.mockResolvedValueOnce({
                rows: [{
                    id: '1',
                    email: loginData.email,
                    password_hash: hashedPassword,
                    first_name: 'Test',
                    last_name: 'User',
                    roles: ['shipper'],
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.token).toBeDefined();
        });

        it('should return error for invalid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            // Mock user not found
            query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid');
        });

        it('should return error for inactive user', async () => {
            const loginData = {
                email: 'inactive@example.com',
                password: 'password123'
            };

            // Mock inactive user
            query.mockResolvedValueOnce({
                rows: [{
                    id: '1',
                    email: loginData.email,
                    password_hash: hashedPassword,
                    is_active: false
                }]
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('deactivated');
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return current user data with valid token', async () => {
            // This would require a valid JWT token in the request
            // We'll need to generate one or mock the auth middleware
            const userData = {
                id: '1',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                roles: ['shipper']
            };

            query.mockResolvedValueOnce({ rows: [userData] });

            // For now, we'll test without authentication
            // In a full implementation, we'd need to generate a valid JWT
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should clear refresh token cookie', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Logout successful');
        });
    });
});