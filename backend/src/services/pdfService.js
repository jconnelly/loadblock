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

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CARRIER INFORMATION', 50, startY);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Company: ${bolData.carrier.companyName}`, 50, startY + 20)
           .text(`Contact: ${bolData.carrier.contactName}`, 50, startY + 35)
           .text(`Email: ${bolData.carrier.email}`, 50, startY + 50)
           .text(`Phone: ${bolData.carrier.phone}`, 50, startY + 65);

        if (bolData.carrier.dotNumber) {
            doc.text(`DOT Number: ${bolData.carrier.dotNumber}`, 300, startY + 20);
        }
        if (bolData.carrier.mcNumber) {
            doc.text(`MC Number: ${bolData.carrier.mcNumber}`, 300, startY + 35);
        }

        if (bolData.carrier.address) {
            doc.text(`Address: ${bolData.carrier.address.street}`, 50, startY + 80)
               .text(`${bolData.carrier.address.city}, ${bolData.carrier.address.state} ${bolData.carrier.address.zipCode}`, 50, startY + 95);
        }

        return startY + 120;
    }

    addCargoInfo(doc, bolData) {
        const startY = 430;

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('CARGO INFORMATION', 50, startY);

        // Table headers
        const tableTop = startY + 25;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Description', 50, tableTop)
           .text('Qty', 200, tableTop)
           .text('Unit', 240, tableTop)
           .text('Weight (lbs)', 280, tableTop)
           .text('Value ($)', 360, tableTop)
           .text('Packaging', 430, tableTop);

        // Draw header line
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(50, tableTop + 15)
           .lineTo(545, tableTop + 15)
           .stroke();

        // Cargo items
        let currentY = tableTop + 25;
        doc.font('Helvetica');

        bolData.cargoItems.forEach((item, index) => {
            doc.text(item.description, 50, currentY)
               .text(item.quantity.toString(), 200, currentY)
               .text(item.unit, 240, currentY)
               .text(item.weight.toFixed(2), 280, currentY)
               .text(item.value.toFixed(2), 360, currentY)
               .text(item.packaging || 'N/A', 430, currentY);

            if (item.hazmat) {
                doc.fillColor('red')
                   .text('HAZMAT', 500, currentY)
                   .fillColor('black');
            }

            currentY += 20;
        });

        // Totals
        currentY += 10;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Total Pieces: ${bolData.totalPieces}`, 50, currentY)
           .text(`Total Weight: ${bolData.totalWeight.toFixed(2)} lbs`, 200, currentY)
           .text(`Total Value: $${bolData.totalValue.toFixed(2)}`, 350, currentY);

        if (bolData.specialInstructions) {
            currentY += 30;
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('Special Instructions:', 50, currentY);
            doc.font('Helvetica')
               .text(bolData.specialInstructions, 50, currentY + 15, { width: 495 });
        }

        return currentY + 60;
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

        // Signature blocks
        doc.fontSize(10)
           .font('Helvetica')
           .text('Shipper Signature: ________________________', 50, startY + 60)
           .text('Date: ____________', 300, startY + 60)
           .text('Carrier Signature: ________________________', 50, startY + 90)
           .text('Date: ____________', 300, startY + 90);

        return startY + 120;
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