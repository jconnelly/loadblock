'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PDFService {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ensureTempDirExists();
    }

    ensureTempDirExists() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async generateBoLPDF(bolData) {
        try {
            logger.info('Starting BoL PDF generation', {
                bolNumber: bolData.bolNumber,
                status: bolData.status
            });

            const filename = `BOL_${bolData.bolNumber}_${Date.now()}.pdf`;
            const filepath = path.join(this.tempDir, filename);

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info: {
                        Title: `Bill of Lading ${bolData.bolNumber}`,
                        Author: 'LoadBlock',
                        Subject: 'Bill of Lading',
                        Creator: 'LoadBlock PDF Service'
                    }
                });

                const stream = fs.createWriteStream(filepath);
                doc.pipe(stream);

                // Header
                this.addHeader(doc, bolData);

                // Shipper and Consignee Information
                this.addShipperConsigneeInfo(doc, bolData);

                // Carrier Information
                this.addCarrierInfo(doc, bolData);

                // Cargo Information
                this.addCargoInfo(doc, bolData);

                // Freight Charges
                this.addFreightCharges(doc, bolData);

                // Status and Signature Section
                this.addStatusAndSignatures(doc, bolData);

                // Footer
                this.addFooter(doc, bolData);

                doc.end();

                stream.on('finish', () => {
                    logger.info('BoL PDF generated successfully', {
                        bolNumber: bolData.bolNumber,
                        filepath: filepath,
                        filesize: fs.statSync(filepath).size
                    });
                    resolve({
                        filepath: filepath,
                        filename: filename,
                        size: fs.statSync(filepath).size
                    });
                });

                stream.on('error', (error) => {
                    logger.error('Error writing PDF file', {
                        bolNumber: bolData.bolNumber,
                        error: error.message
                    });
                    reject(error);
                });
            });

        } catch (error) {
            logger.error('Error generating BoL PDF', {
                bolNumber: bolData.bolNumber,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    addHeader(doc, bolData) {
        // LoadBlock Logo Area
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#0D47A1')
           .text('LOADBLOCK', 50, 50);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('black')
           .text('Blockchain-Based Bill of Lading', 50, 75);

        // Bill of Lading Title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('BILL OF LADING', 350, 50);

        // BoL Number and Status
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`BoL Number: ${bolData.bolNumber}`, 350, 75)
           .text(`Status: ${bolData.status.toUpperCase()}`, 350, 90)
           .text(`Date: ${new Date().toLocaleDateString()}`, 350, 105);

        // Add line separator
        doc.strokeColor('#0D47A1')
           .lineWidth(2)
           .moveTo(50, 130)
           .lineTo(545, 130)
           .stroke();

        return 150;
    }

    addShipperConsigneeInfo(doc, bolData) {
        const startY = 150;

        // Shipper Information
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('SHIPPER', 50, startY);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Company: ${bolData.shipper.companyName}`, 50, startY + 20)
           .text(`Contact: ${bolData.shipper.contactName}`, 50, startY + 35)
           .text(`Email: ${bolData.shipper.email}`, 50, startY + 50)
           .text(`Phone: ${bolData.shipper.phone}`, 50, startY + 65);

        if (bolData.shipper.address) {
            doc.text(`Address: ${bolData.shipper.address.street}`, 50, startY + 80)
               .text(`${bolData.shipper.address.city}, ${bolData.shipper.address.state} ${bolData.shipper.address.zipCode}`, 50, startY + 95)
               .text(`${bolData.shipper.address.country}`, 50, startY + 110);
        }

        // Consignee Information
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CONSIGNEE', 300, startY);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Company: ${bolData.consignee.companyName}`, 300, startY + 20)
           .text(`Contact: ${bolData.consignee.contactName}`, 300, startY + 35)
           .text(`Email: ${bolData.consignee.email}`, 300, startY + 50)
           .text(`Phone: ${bolData.consignee.phone}`, 300, startY + 65);

        if (bolData.consignee.address) {
            doc.text(`Address: ${bolData.consignee.address.street}`, 300, startY + 80)
               .text(`${bolData.consignee.address.city}, ${bolData.consignee.address.state} ${bolData.consignee.address.zipCode}`, 300, startY + 95)
               .text(`${bolData.consignee.address.country}`, 300, startY + 110);
        }

        return startY + 140;
    }

    addCarrierInfo(doc, bolData) {
        const startY = 300;

        // Carrier Information Section with border for professional appearance
        doc.rect(45, startY - 5, 505, 135).stroke();

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CARRIER INFORMATION', 50, startY);

        // Left column - Basic contact info
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Company: ${bolData.carrier.companyName}`, 50, startY + 20)
           .text(`Contact: ${bolData.carrier.contactName}`, 50, startY + 35)
           .text(`Email: ${bolData.carrier.email}`, 50, startY + 50)
           .text(`Phone: ${bolData.carrier.phone}`, 50, startY + 65);

        // Right column - Regulatory compliance info (industry standard)
        doc.font('Helvetica-Bold')
           .text('REGULATORY COMPLIANCE', 300, startY);

        doc.font('Helvetica');
        if (bolData.carrier.dotNumber) {
            doc.text(`DOT Number: ${bolData.carrier.dotNumber}`, 300, startY + 20);
        }
        if (bolData.carrier.mcNumber) {
            doc.text(`MC Number: ${bolData.carrier.mcNumber}`, 300, startY + 35);
        }
        if (bolData.carrier.scacCode) {
            doc.text(`SCAC Code: ${bolData.carrier.scacCode}`, 300, startY + 50);
        } else {
            doc.text('SCAC Code: Not Provided', 300, startY + 50);
        }
        if (bolData.carrier.insurancePolicy) {
            doc.text(`Insurance: ${bolData.carrier.insurancePolicy}`, 300, startY + 65);
        } else {
            doc.text('Insurance: See Carrier Agreement', 300, startY + 65);
        }

        // Address at bottom spanning full width
        if (bolData.carrier.address) {
            doc.font('Helvetica-Bold')
               .text('CARRIER ADDRESS:', 50, startY + 85);
            doc.font('Helvetica')
               .text(`${bolData.carrier.address.street}`, 50, startY + 100)
               .text(`${bolData.carrier.address.city}, ${bolData.carrier.address.state} ${bolData.carrier.address.zipCode}`, 50, startY + 115);
        }

        return startY + 140;
    }

    addCargoInfo(doc, bolData) {
        const startY = 450;

        // Cargo section border
        doc.rect(45, startY - 5, 505, 180).stroke();

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CARGO INFORMATION & COMMODITY DETAILS', 50, startY);

        // Enhanced table headers with better spacing
        const tableTop = startY + 25;
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text('DESCRIPTION', 50, tableTop)
           .text('QTY', 180, tableTop)
           .text('UNIT', 210, tableTop)
           .text('WEIGHT', 250, tableTop)
           .text('VALUE', 300, tableTop)
           .text('PACKAGE', 340, tableTop)
           .text('CLASS', 390, tableTop)
           .text('HAZMAT', 430, tableTop)
           .text('DIMS', 470, tableTop);

        // Draw header lines for professional appearance
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(50, tableTop + 15)
           .lineTo(545, tableTop + 15)
           .stroke();

        // Cargo items with enhanced formatting
        let currentY = tableTop + 25;
        let totalPieces = 0;
        let totalWeight = 0;
        let totalValue = 0;

        doc.font('Helvetica');
        doc.fontSize(8);

        bolData.cargoItems.forEach((item, index) => {
            // Calculate totals dynamically
            totalPieces += item.quantity || 0;
            totalWeight += item.weight || 0;
            totalValue += item.value || 0;

            doc.text(item.description, 50, currentY, { width: 125 })
               .text((item.quantity || 0).toString(), 180, currentY)
               .text(item.unit || 'PC', 210, currentY)
               .text((item.weight || 0).toFixed(1), 250, currentY)
               .text(`$${(item.value || 0).toFixed(2)}`, 300, currentY)
               .text(item.packaging || 'N/A', 340, currentY)
               .text(item.freightClass || '70', 390, currentY)
               .text(item.dimensions || 'N/A', 470, currentY);

            // Hazmat indicator with proper formatting
            if (item.hazmat) {
                doc.fillColor('red')
                   .font('Helvetica-Bold')
                   .text('YES', 430, currentY)
                   .fillColor('black')
                   .font('Helvetica');
            } else {
                doc.text('NO', 430, currentY);
            }

            currentY += 15;
        });

        // Draw line above totals
        currentY += 5;
        doc.moveTo(50, currentY)
           .lineTo(545, currentY)
           .stroke();

        // Enhanced totals section with calculations
        currentY += 10;
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('SHIPMENT TOTALS:', 50, currentY);

        currentY += 20;
        doc.fontSize(10)
           .text(`Total Pieces: ${totalPieces}`, 50, currentY)
           .text(`Total Weight: ${totalWeight.toFixed(2)} lbs`, 180, currentY)
           .text(`Total Value: $${totalValue.toFixed(2)}`, 300, currentY);

        // Declared value for liability purposes
        currentY += 15;
        doc.text(`Declared Value for Carriage: $${Math.min(totalValue, 100000).toFixed(2)}`, 50, currentY);
        doc.fontSize(8)
           .font('Helvetica')
           .text('(Limited to $100,000 unless declared and charges paid)', 300, currentY);

        // Special instructions with better formatting
        if (bolData.specialInstructions) {
            currentY += 25;
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('SPECIAL INSTRUCTIONS / HANDLING REQUIREMENTS:', 50, currentY);
            doc.fontSize(9)
               .font('Helvetica')
               .text(bolData.specialInstructions, 50, currentY + 15, { width: 495 });
            currentY += 30;
        }

        return currentY + 20;
    }

    addFreightCharges(doc, bolData) {
        const startY = 620;

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('FREIGHT CHARGES', 50, startY);

        if (bolData.freightCharges) {
            const charges = bolData.freightCharges;
            doc.fontSize(10)
               .font('Helvetica')
               .text(`Base Rate: $${charges.baseRate.toFixed(2)}`, 50, startY + 25)
               .text(`Fuel Surcharge: $${charges.fuelSurcharge.toFixed(2)}`, 50, startY + 40)
               .text(`Accessorial Charges: $${charges.accessorialCharges.toFixed(2)}`, 50, startY + 55);

            doc.font('Helvetica-Bold')
               .text(`Total Charges: $${charges.totalCharges.toFixed(2)}`, 50, startY + 75);

            doc.font('Helvetica')
               .text(`Payment Terms: ${charges.paymentTerms}`, 300, startY + 25)
               .text(`Bill To: ${charges.billTo}`, 300, startY + 40);
        }

        return startY + 100;
    }

    addStatusAndSignatures(doc, bolData) {
        const startY = 730;

        // Status History
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Current Status:', 50, startY);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Status: ${bolData.status}`, 50, startY + 20);

        if (bolData.pickupDate) {
            doc.text(`Pickup Date: ${bolData.pickupDate}`, 50, startY + 35);
        }

        // Professional signature and compliance section
        const sigStartY = startY + 50;

        // Terms and Conditions compliance section
        doc.rect(45, sigStartY - 5, 505, 120).stroke();

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('TERMS, CONDITIONS & DIGITAL SIGNATURES', 50, sigStartY);

        // Compliance statements
        doc.fontSize(8)
           .font('Helvetica')
           .text('This shipment is subject to the terms and conditions of the Uniform Bill of Lading.', 50, sigStartY + 20)
           .text('Carrier liability is limited. See back of original bill for full terms and conditions.', 50, sigStartY + 30)
           .text('This document has been digitally signed and recorded on blockchain for authenticity.', 50, sigStartY + 40);

        // Digital signature blocks with enhanced formatting
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('SHIPPER CERTIFICATION:', 50, sigStartY + 60);

        doc.fontSize(9)
           .font('Helvetica')
           .text('The shipper certifies that the above-named materials are properly classified, described,', 50, sigStartY + 75)
           .text('packaged, marked and labeled and are in proper condition for transportation.', 50, sigStartY + 85);

        // Signature lines with proper spacing
        doc.fontSize(10)
           .text('Shipper Signature: ________________________________     Date: _______________', 50, sigStartY + 105)
           .text('Print Name: ______________________________________     Title: _______________', 300, sigStartY + 105);

        // Add blockchain verification notice
        if (bolData.blockchainTxId || bolData.digitalSignatures) {
            doc.fontSize(8)
               .font('Helvetica-Bold')
               .fillColor('#0D47A1')
               .text('✓ DIGITALLY VERIFIED THROUGH BLOCKCHAIN TECHNOLOGY', 50, sigStartY + 125)
               .fillColor('black');
        }

        return sigStartY + 145;
    }

    addFooter(doc, bolData) {
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 50;

        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text('LoadBlock - Blockchain-Based Transportation Management', 50, footerY, {
               width: 495,
               align: 'center'
           });

        if (bolData.blockchainTxId) {
            doc.text(`Blockchain Transaction ID: ${bolData.blockchainTxId}`, 50, footerY + 15, {
                width: 495,
                align: 'center'
            });
        }

        if (bolData.ipfsHash) {
            doc.text(`IPFS Hash: ${bolData.ipfsHash}`, 50, footerY + 25, {
                width: 495,
                align: 'center'
            });
        }
    }

    async deleteTemporaryFile(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                logger.info('Temporary PDF file deleted', { filepath });
            }
        } catch (error) {
            logger.warn('Failed to delete temporary PDF file', {
                filepath,
                error: error.message
            });
        }
    }

    async cleanupOldFiles(maxAgeHours = 24) {
        try {
            const files = fs.readdirSync(this.tempDir);
            const now = Date.now();
            const maxAge = maxAgeHours * 60 * 60 * 1000;

            for (const file of files) {
                const filepath = path.join(this.tempDir, file);
                const stats = fs.statSync(filepath);

                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filepath);
                    logger.info('Cleaned up old PDF file', { filepath });
                }
            }
        } catch (error) {
            logger.error('Error cleaning up temporary files', {
                error: error.message
            });
        }
    }
}

module.exports = new PDFService();