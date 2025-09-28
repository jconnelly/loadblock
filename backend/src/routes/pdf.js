'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');
const router = express.Router();

// Validation schemas
const bolDataValidation = [
    body('bolData').isObject().withMessage('BoL data must be an object'),
    body('bolData.bolNumber').notEmpty().withMessage('BoL number is required'),
    body('bolData.status').notEmpty().withMessage('BoL status is required'),
    body('bolData.shipper').isObject().withMessage('Shipper information is required'),
    body('bolData.shipper.companyName').notEmpty().withMessage('Shipper company name is required'),
    body('bolData.shipper.contactName').notEmpty().withMessage('Shipper contact name is required'),
    body('bolData.shipper.email').isEmail().withMessage('Valid shipper email is required'),
    body('bolData.shipper.phone').notEmpty().withMessage('Shipper phone is required'),
    body('bolData.consignee').isObject().withMessage('Consignee information is required'),
    body('bolData.consignee.companyName').notEmpty().withMessage('Consignee company name is required'),
    body('bolData.consignee.contactName').notEmpty().withMessage('Consignee contact name is required'),
    body('bolData.consignee.email').isEmail().withMessage('Valid consignee email is required'),
    body('bolData.consignee.phone').notEmpty().withMessage('Consignee phone is required'),
    body('bolData.carrier').isObject().withMessage('Carrier information is required'),
    body('bolData.carrier.companyName').notEmpty().withMessage('Carrier company name is required'),
    body('bolData.carrier.contactName').notEmpty().withMessage('Carrier contact name is required'),
    body('bolData.cargoItems').isArray({ min: 1 }).withMessage('At least one cargo item is required'),
    body('bolData.totalWeight').isNumeric().withMessage('Total weight must be numeric'),
    body('bolData.totalValue').isNumeric().withMessage('Total value must be numeric'),
    body('bolData.totalPieces').isInt({ min: 1 }).withMessage('Total pieces must be a positive integer')
];

const bolNumberValidation = [
    param('bolNumber').notEmpty().withMessage('BoL number is required')
];

const cleanupValidation = [
    query('maxAge').optional().isInt({ min: 1, max: 168 }).withMessage('Max age must be between 1 and 168 hours')
];

// Routes

// Generate PDF from provided BoL data
router.post('/generate',
    authMiddleware.verifyToken,
    authMiddleware.requireRoles(['admin', 'carrier', 'shipper', 'broker']),
    bolDataValidation,
    validationMiddleware.handleValidationErrors,
    pdfController.generateBoLPDF
);

// Generate PDF preview (inline display)
router.post('/preview',
    authMiddleware.verifyToken,
    authMiddleware.requireRoles(['admin', 'carrier', 'shipper', 'broker']),
    bolDataValidation,
    validationMiddleware.handleValidationErrors,
    pdfController.previewBoLPDF
);

// Generate PDF from database BoL (future implementation)
router.get('/bol/:bolNumber',
    authMiddleware.verifyToken,
    authMiddleware.requireRoles(['admin', 'carrier', 'shipper', 'broker', 'consignee']),
    bolNumberValidation,
    validationMiddleware.handleValidationErrors,
    pdfController.generateBoLPDFFromDatabase
);

// Admin endpoint to cleanup temporary files
router.post('/cleanup',
    authMiddleware.verifyToken,
    authMiddleware.requireRoles(['admin']),
    cleanupValidation,
    validationMiddleware.handleValidationErrors,
    pdfController.cleanupTempFiles
);

module.exports = router;