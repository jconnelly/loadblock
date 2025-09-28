'use strict';

const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class PDFController {
    async generateBoLPDF(req, res) {
        try {
            const { bolData } = req.body;

            if (!bolData) {
                return res.status(400).json({
                    success: false,
                    error: 'BoL data is required'
                });
            }

            if (!bolData.bolNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'BoL number is required'
                });
            }

            logger.info('PDF generation request received', {
                bolNumber: bolData.bolNumber,
                userId: req.user?.id,
                userRole: req.user?.role
            });

            const pdfResult = await pdfService.generateBoLPDF(bolData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
            res.setHeader('Content-Length', pdfResult.size);

            const fileStream = fs.createReadStream(pdfResult.filepath);
            fileStream.pipe(res);

            fileStream.on('end', () => {
                // Clean up temporary file after sending
                setTimeout(() => {
                    pdfService.deleteTemporaryFile(pdfResult.filepath);
                }, 1000);
            });

        } catch (error) {
            logger.error('Error generating PDF', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to generate PDF',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    async previewBoLPDF(req, res) {
        try {
            const { bolData } = req.body;

            if (!bolData || !bolData.bolNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid BoL data with BoL number is required'
                });
            }

            logger.info('PDF preview request received', {
                bolNumber: bolData.bolNumber,
                userId: req.user?.id
            });

            const pdfResult = await pdfService.generateBoLPDF(bolData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Content-Length', pdfResult.size);

            const fileStream = fs.createReadStream(pdfResult.filepath);
            fileStream.pipe(res);

            fileStream.on('end', () => {
                // Clean up temporary file after sending
                setTimeout(() => {
                    pdfService.deleteTemporaryFile(pdfResult.filepath);
                }, 1000);
            });

        } catch (error) {
            logger.error('Error generating PDF preview', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to generate PDF preview'
            });
        }
    }

    async generateBoLPDFFromDatabase(req, res) {
        try {
            const { bolNumber } = req.params;

            if (!bolNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'BoL number is required'
                });
            }

            // TODO: Implement database lookup for BoL data
            // This will be implemented when we integrate with the real database
            logger.info('Database BoL PDF generation requested', {
                bolNumber,
                userId: req.user?.id
            });

            res.status(501).json({
                success: false,
                error: 'Database integration not yet implemented',
                message: 'This endpoint will be available after database integration'
            });

        } catch (error) {
            logger.error('Error generating PDF from database', {
                error: error.message,
                bolNumber: req.params.bolNumber,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to generate PDF from database'
            });
        }
    }

    async cleanupTempFiles(req, res) {
        try {
            const maxAgeHours = req.query.maxAge || 24;

            logger.info('Manual cleanup requested', {
                maxAgeHours,
                userId: req.user?.id,
                userRole: req.user?.role
            });

            // Only allow admin users to run cleanup
            if (!req.user?.role?.includes('admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            await pdfService.cleanupOldFiles(parseInt(maxAgeHours));

            res.json({
                success: true,
                message: `Cleaned up files older than ${maxAgeHours} hours`
            });

        } catch (error) {
            logger.error('Error cleaning up temp files', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to cleanup temporary files'
            });
        }
    }
}

module.exports = new PDFController();