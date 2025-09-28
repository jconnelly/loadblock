'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const pdfService = require('../services/pdfService');
const jwt = require('jsonwebtoken');

// Mock the database connection
jest.mock('../config/database', () => ({
    testConnection: jest.fn().mockResolvedValue(true),
    query: jest.fn()
}));

// Mock the PDF service
jest.mock('../services/pdfService', () => ({
    generateBoLPDF: jest.fn(),
    deleteTemporaryFile: jest.fn(),
    cleanupOldFiles: jest.fn()
}));

describe('PDF Controller', () => {
    let app;
    let authToken;

    const sampleBoLData = {
        bolNumber: 'BOL-2025-000001',
        status: 'approved',
        shipper: {
            companyName: 'Test Shipper',
            contactName: 'John Doe',
            email: 'john@testshipper.com',
            phone: '555-0123',
            address: {
                street: '123 Test St',
                city: 'Test City',
                state: 'TC',
                zipCode: '12345',
                country: 'USA'
            }
        },
        consignee: {
            companyName: 'Test Consignee',
            contactName: 'Jane Doe',
            email: 'jane@testconsignee.com',
            phone: '555-0456',
            address: {
                street: '456 Test Ave',
                city: 'Test Town',
                state: 'TT',
                zipCode: '67890',
                country: 'USA'
            }
        },
        carrier: {
            companyName: 'Test Carrier',
            contactName: 'Bob Smith',
            email: 'bob@testcarrier.com',
            phone: '555-0789'
        },
        cargoItems: [{
            description: 'Test Cargo',
            quantity: 10,
            unit: 'pieces',
            weight: 500,
            value: 10000
        }],
        totalWeight: 500,
        totalValue: 10000,
        totalPieces: 10
    };

    beforeEach(() => {
        app = createApp();
        jest.clearAllMocks();

        // Generate a test JWT token
        authToken = jwt.sign(
            {
                id: '1',
                email: 'test@example.com',
                roles: ['carrier']
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    describe('POST /api/v1/pdf/generate', () => {
        it('should generate PDF successfully with valid data', async () => {
            const mockPdfResult = {
                filepath: '/tmp/test.pdf',
                filename: 'BOL_BOL-2025-000001_123456.pdf',
                size: 5000
            };

            pdfService.generateBoLPDF.mockResolvedValue(mockPdfResult);

            // Mock file system response for PDF streaming
            const fs = require('fs');
            jest.spyOn(fs, 'createReadStream').mockReturnValue({
                pipe: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'end') {
                        setTimeout(callback, 10);
                    }
                })
            });

            const response = await request(app)
                .post('/api/v1/pdf/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ bolData: sampleBoLData })
                .expect(200);

            expect(pdfService.generateBoLPDF).toHaveBeenCalledWith(sampleBoLData);
            expect(response.headers['content-type']).toBe('application/pdf');
        });

        it('should return error for missing BoL data', async () => {
            const response = await request(app)
                .post('/api/v1/pdf/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('BoL data is required');
        });

        it('should return error for missing BoL number', async () => {
            const invalidData = { ...sampleBoLData };
            delete invalidData.bolNumber;

            const response = await request(app)
                .post('/api/v1/pdf/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ bolData: invalidData })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('BoL number is required');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/pdf/generate')
                .send({ bolData: sampleBoLData })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/pdf/preview', () => {
        it('should generate PDF preview successfully', async () => {
            const mockPdfResult = {
                filepath: '/tmp/preview.pdf',
                filename: 'BOL_BOL-2025-000001_123456.pdf',
                size: 5000
            };

            pdfService.generateBoLPDF.mockResolvedValue(mockPdfResult);

            // Mock file system response
            const fs = require('fs');
            jest.spyOn(fs, 'createReadStream').mockReturnValue({
                pipe: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'end') {
                        setTimeout(callback, 10);
                    }
                })
            });

            const response = await request(app)
                .post('/api/v1/pdf/preview')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ bolData: sampleBoLData })
                .expect(200);

            expect(pdfService.generateBoLPDF).toHaveBeenCalledWith(sampleBoLData);
            expect(response.headers['content-disposition']).toBe('inline');
        });
    });

    describe('GET /api/v1/pdf/bol/:bolNumber', () => {
        it('should return not implemented error', async () => {
            const response = await request(app)
                .get('/api/v1/pdf/bol/BOL-2025-000001')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(501);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not yet implemented');
        });
    });

    describe('POST /api/v1/pdf/cleanup', () => {
        it('should require admin role', async () => {
            // Create token with non-admin role
            const userToken = jwt.sign(
                {
                    id: '2',
                    email: 'user@example.com',
                    roles: ['shipper']
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .post('/api/v1/pdf/cleanup')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Admin access required');
        });

        it('should cleanup files for admin user', async () => {
            // Create admin token
            const adminToken = jwt.sign(
                {
                    id: '1',
                    email: 'admin@example.com',
                    roles: ['admin']
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            pdfService.cleanupOldFiles.mockResolvedValue();

            const response = await request(app)
                .post('/api/v1/pdf/cleanup')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ maxAge: 12 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(pdfService.cleanupOldFiles).toHaveBeenCalledWith(12);
        });
    });
});