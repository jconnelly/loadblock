'use strict';

const pdfService = require('./pdfService');
const fs = require('fs');
const path = require('path');

describe('PDFService', () => {
    const sampleBoLData = {
        bolNumber: 'BOL-2025-000001',
        status: 'approved',
        shipper: {
            companyName: 'LoadBlock Logistics',
            contactName: 'John Shipper',
            email: 'shipper@loadblock.io',
            phone: '555-0123',
            address: {
                street: '123 Shipping Lane',
                city: 'Transport City',
                state: 'TC',
                zipCode: '12345',
                country: 'United States'
            }
        },
        consignee: {
            companyName: 'Destination Warehouses Inc',
            contactName: 'Jane Consignee',
            email: 'consignee@destination.com',
            phone: '555-0456',
            address: {
                street: '456 Delivery Blvd',
                city: 'Receive City',
                state: 'RC',
                zipCode: '67890',
                country: 'United States'
            }
        },
        carrier: {
            companyName: 'FastTrack Trucking',
            contactName: 'Bob Carrier',
            email: 'carrier@fasttrack.com',
            phone: '555-0789',
            address: {
                street: '789 Trucking Ave',
                city: 'Carrier City',
                state: 'CC',
                zipCode: '13579',
                country: 'United States'
            },
            dotNumber: 'DOT123456',
            mcNumber: 'MC987654'
        },
        cargoItems: [
            {
                id: 'item1',
                description: 'Electronics Components',
                quantity: 25,
                unit: 'pieces',
                weight: 1500.00,
                value: 50000.00,
                packaging: 'Palletized',
                hazmat: false
            }
        ],
        totalWeight: 1500.00,
        totalValue: 50000.00,
        totalPieces: 25,
        pickupDate: '2025-09-30',
        specialInstructions: 'Handle with care - electronics',
        freightCharges: {
            baseRate: 1200.00,
            fuelSurcharge: 150.00,
            accessorialCharges: 50.00,
            totalCharges: 1400.00,
            paymentTerms: 'prepaid',
            billTo: 'shipper'
        },
        createdBy: 'user123'
    };

    afterEach(async () => {
        // Clean up any test files
        try {
            const tempDir = path.join(__dirname, '../../temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                for (const file of files) {
                    if (file.startsWith('BOL_') && file.endsWith('.pdf')) {
                        fs.unlinkSync(path.join(tempDir, file));
                    }
                }
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('generateBoLPDF', () => {
        it('should generate a PDF for valid BoL data', async () => {
            const result = await pdfService.generateBoLPDF(sampleBoLData);

            expect(result).toHaveProperty('filepath');
            expect(result).toHaveProperty('filename');
            expect(result).toHaveProperty('size');
            expect(result.filename).toMatch(/^BOL_BOL-2025-000001_\d+\.pdf$/);
            expect(fs.existsSync(result.filepath)).toBe(true);
            expect(result.size).toBeGreaterThan(0);
        });

        it('should generate PDF with correct filename format', async () => {
            const result = await pdfService.generateBoLPDF(sampleBoLData);

            expect(result.filename).toContain('BOL_BOL-2025-000001_');
            expect(result.filename).toMatch(/\.pdf$/);
        });

        it('should handle missing optional fields gracefully', async () => {
            const minimalData = {
                bolNumber: 'BOL-2025-000002',
                status: 'pending',
                shipper: {
                    companyName: 'Test Shipper',
                    contactName: 'Test Contact',
                    email: 'test@shipper.com',
                    phone: '555-0000'
                },
                consignee: {
                    companyName: 'Test Consignee',
                    contactName: 'Test Contact',
                    email: 'test@consignee.com',
                    phone: '555-0001'
                },
                carrier: {
                    companyName: 'Test Carrier',
                    contactName: 'Test Contact',
                    email: 'test@carrier.com',
                    phone: '555-0002'
                },
                cargoItems: [{
                    description: 'Test Item',
                    quantity: 1,
                    unit: 'piece',
                    weight: 100,
                    value: 1000
                }],
                totalWeight: 100,
                totalValue: 1000,
                totalPieces: 1
            };

            const result = await pdfService.generateBoLPDF(minimalData);

            expect(result).toHaveProperty('filepath');
            expect(fs.existsSync(result.filepath)).toBe(true);
        });

        it('should throw error for missing required data', async () => {
            const invalidData = {
                status: 'pending'
                // Missing bolNumber and other required fields
            };

            await expect(pdfService.generateBoLPDF(invalidData))
                .rejects.toThrow();
        });
    });

    describe('deleteTemporaryFile', () => {
        it('should delete existing file', async () => {
            const result = await pdfService.generateBoLPDF(sampleBoLData);

            expect(fs.existsSync(result.filepath)).toBe(true);

            await pdfService.deleteTemporaryFile(result.filepath);

            expect(fs.existsSync(result.filepath)).toBe(false);
        });

        it('should handle non-existent file gracefully', async () => {
            const nonExistentPath = '/path/that/does/not/exist.pdf';

            await expect(pdfService.deleteTemporaryFile(nonExistentPath))
                .resolves.not.toThrow();
        });
    });

    describe('cleanupOldFiles', () => {
        it('should not delete recent files', async () => {
            const result = await pdfService.generateBoLPDF(sampleBoLData);

            await pdfService.cleanupOldFiles(24); // 24 hours

            expect(fs.existsSync(result.filepath)).toBe(true);
        });

        it('should handle empty temp directory', async () => {
            await expect(pdfService.cleanupOldFiles(1))
                .resolves.not.toThrow();
        });
    });
});