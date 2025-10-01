'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * LoadBlock Smart Contract for Immutable Bill of Lading Management
 *
 * This chaincode manages approved Bills of Lading with complete audit trails.
 * Once a BoL is approved by both shipper and carrier, it transitions from
 * PostgreSQL to this immutable blockchain storage with IPFS PDF references.
 */
class LoadBlockContract extends Contract {

    /**
     * Initialize the ledger with default data
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');

        // Get deterministic timestamp from transaction
        const txTimestamp = ctx.stub.getTxTimestamp();
        const initTime = new Date(txTimestamp.seconds.toInt() * 1000).toISOString();

        // Initialize contract metadata
        const contractInfo = {
            name: 'LoadBlock BoL Management',
            version: '1.0.0',
            description: 'Immutable Bill of Lading storage and status management',
            initialized: initTime,
            totalBols: 0,
            docType: 'contractInfo'
        };

        await ctx.stub.putState('CONTRACT_INFO', Buffer.from(JSON.stringify(contractInfo)));
        console.info('Contract initialized successfully');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Create a new approved BoL on the blockchain
     * Called when PostgreSQL BoL receives dual approval
     */
    async createApprovedBoL(ctx, bolData, ipfsHash) {
        console.info('============= START : Create Approved BoL ===========');

        const bolObj = JSON.parse(bolData);
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toInt() * 1000).toISOString();
        const txId = ctx.stub.getTxID();

        // Validate required fields
        this._validateBoLData(bolObj);

        // Check if BoL already exists
        const exists = await this._bolExists(ctx, bolObj.bolNumber);
        if (exists) {
            throw new Error(`BoL ${bolObj.bolNumber} already exists on blockchain`);
        }

        // Create the blockchain BoL record
        const blockchainBoL = {
            bolNumber: bolObj.bolNumber,
            status: 'approved', // Always starts as approved when hitting blockchain

            // Core BoL information
            shipper: bolObj.shipper,
            consignee: bolObj.consignee,
            carrier: bolObj.carrier,
            broker: bolObj.broker || null,

            // Cargo and financial information
            cargoItems: bolObj.cargoItems,
            totalWeight: bolObj.totalWeight,
            totalValue: bolObj.totalValue,
            totalPieces: bolObj.totalPieces,
            freightCharges: bolObj.freightCharges,

            // Dates and instructions
            pickupDate: bolObj.pickupDate,
            deliveryDate: bolObj.deliveryDate || null,
            specialInstructions: bolObj.specialInstructions || '',

            // Hazmat information
            hazmatInfo: bolObj.hazmatInfo || null,

            // Blockchain-specific fields
            ipfsHash: ipfsHash, // PDF document hash
            createdBy: bolObj.createdBy,
            approvedAt: timestamp,
            blockchainTxId: txId,
            version: 1,

            // Status workflow tracking
            statusHistory: [{
                status: 'approved',
                changedBy: bolObj.createdBy,
                changedAt: timestamp,
                txId: txId,
                ipfsHash: ipfsHash,
                notes: 'BoL approved and committed to blockchain'
            }],

            // Metadata
            docType: 'bol',
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Store the BoL on the blockchain
        await ctx.stub.putState(bolObj.bolNumber, Buffer.from(JSON.stringify(blockchainBoL)));

        // Update contract statistics
        await this._updateContractStats(ctx, 'bolCreated');

        // Emit event
        const eventPayload = {
            bolNumber: bolObj.bolNumber,
            status: 'approved',
            txId: txId,
            ipfsHash: ipfsHash,
            timestamp: timestamp
        };
        ctx.stub.setEvent('BoLCreated', Buffer.from(JSON.stringify(eventPayload)));

        console.info(`BoL ${bolObj.bolNumber} successfully created on blockchain`);
        console.info('============= END : Create Approved BoL ===========');

        return JSON.stringify(blockchainBoL);
    }

    /**
     * Update BoL status with audit trail
     * Creates new version while preserving history
     */
    async updateBoLStatus(ctx, bolNumber, newStatus, userId, notes, newIpfsHash) {
        console.info('============= START : Update BoL Status ===========');

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toInt() * 1000).toISOString();
        const txId = ctx.stub.getTxID();

        // Validate status transition
        this._validateStatusTransition(newStatus);

        // Get current BoL
        const bolBytes = await ctx.stub.getState(bolNumber);
        if (!bolBytes || bolBytes.length === 0) {
            throw new Error(`BoL ${bolNumber} does not exist on blockchain`);
        }

        const bol = JSON.parse(bolBytes.toString());

        // Validate status transition logic
        this._validateStatusFlow(bol.status, newStatus);

        // Update BoL with new status
        bol.status = newStatus;
        bol.updatedAt = timestamp;
        bol.version += 1;

        // Update IPFS hash if new PDF generated
        if (newIpfsHash) {
            bol.ipfsHash = newIpfsHash;
        }

        // Add to status history
        const statusChange = {
            status: newStatus,
            changedBy: userId,
            changedAt: timestamp,
            txId: txId,
            ipfsHash: newIpfsHash || bol.ipfsHash,
            notes: notes || `Status changed to ${newStatus}`
        };
        bol.statusHistory.push(statusChange);

        // Update delivery date for delivered status
        if (newStatus === 'delivered' && !bol.deliveryDate) {
            bol.deliveryDate = timestamp.split('T')[0]; // Extract date part
        }

        // Store updated BoL
        await ctx.stub.putState(bolNumber, Buffer.from(JSON.stringify(bol)));

        // Emit event
        const eventPayload = {
            bolNumber: bolNumber,
            oldStatus: bol.statusHistory[bol.statusHistory.length - 2]?.status || 'unknown',
            newStatus: newStatus,
            changedBy: userId,
            txId: txId,
            ipfsHash: newIpfsHash || bol.ipfsHash,
            timestamp: timestamp
        };
        ctx.stub.setEvent('BoLStatusUpdated', Buffer.from(JSON.stringify(eventPayload)));

        console.info(`BoL ${bolNumber} status updated to ${newStatus}`);
        console.info('============= END : Update BoL Status ===========');

        return JSON.stringify(bol);
    }

    /**
     * Get BoL by number
     */
    async getBoL(ctx, bolNumber) {
        const bolBytes = await ctx.stub.getState(bolNumber);
        if (!bolBytes || bolBytes.length === 0) {
            throw new Error(`BoL ${bolNumber} does not exist`);
        }
        return bolBytes.toString();
    }

    /**
     * Get complete BoL history including all status changes
     */
    async getBoLHistory(ctx, bolNumber) {
        console.info('============= START : Get BoL History ===========');

        const iterator = await ctx.stub.getHistoryForKey(bolNumber);
        const history = [];

        while (true) {
            const result = await iterator.next();

            if (result.value && result.value.value.toString()) {
                const record = {
                    txId: result.value.tx_id,
                    timestamp: result.value.timestamp,
                    isDelete: result.value.is_delete.toString(),
                    value: JSON.parse(result.value.value.toString())
                };
                history.push(record);
            }

            if (result.done) {
                await iterator.close();
                break;
            }
        }

        console.info(`Retrieved ${history.length} history records for BoL ${bolNumber}`);
        console.info('============= END : Get BoL History ===========');

        return JSON.stringify(history);
    }

    /**
     * Query BoLs by status
     */
    async queryBoLsByStatus(ctx, status) {
        const queryString = {
            selector: {
                docType: 'bol',
                status: status
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this._getAllResults(iterator);
        return JSON.stringify(results);
    }

    /**
     * Query BoLs by carrier
     */
    async queryBoLsByCarrier(ctx, carrierId) {
        const queryString = {
            selector: {
                docType: 'bol',
                'carrier.id': carrierId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this._getAllResults(iterator);
        return JSON.stringify(results);
    }

    /**
     * Query BoLs by date range
     */
    async queryBoLsByDateRange(ctx, startDate, endDate) {
        const queryString = {
            selector: {
                docType: 'bol',
                createdAt: {
                    '$gte': startDate,
                    '$lte': endDate
                }
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this._getAllResults(iterator);
        return JSON.stringify(results);
    }

    /**
     * Get all BoLs (with pagination support)
     */
    async getAllBoLs(ctx, pageSize, bookmark) {
        const parsedPageSize = parseInt(pageSize) || 50;
        const iterator = await ctx.stub.getStateByRangeWithPagination('', '', parsedPageSize, bookmark);

        const results = [];
        while (true) {
            const result = await iterator.next();
            if (result.value && result.value.value.toString()) {
                try {
                    const record = JSON.parse(result.value.value.toString());
                    if (record.docType === 'bol') {
                        results.push({
                            key: result.value.key,
                            record: record
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to parse record: ${err.message}`);
                }
            }
            if (result.done) {
                break;
            }
        }

        const responseMetadata = await iterator.getMetadata();
        iterator.close();

        return JSON.stringify({
            results: results,
            responseMetadata: responseMetadata
        });
    }

    /**
     * Get contract statistics
     */
    async getContractInfo(ctx) {
        const infoBytes = await ctx.stub.getState('CONTRACT_INFO');
        if (!infoBytes || infoBytes.length === 0) {
            throw new Error('Contract not initialized');
        }
        return infoBytes.toString();
    }

    // ========== PRIVATE HELPER METHODS ==========

    /**
     * Validate BoL data structure
     */
    _validateBoLData(bolData) {
        const required = ['bolNumber', 'shipper', 'consignee', 'carrier', 'cargoItems', 'pickupDate'];

        for (const field of required) {
            if (!bolData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate BoL number format
        if (!/^BOL-\d{4}-\d{6}$/.test(bolData.bolNumber)) {
            throw new Error(`Invalid BoL number format: ${bolData.bolNumber}`);
        }

        // Validate cargo items
        if (!Array.isArray(bolData.cargoItems) || bolData.cargoItems.length === 0) {
            throw new Error('BoL must have at least one cargo item');
        }
    }

    /**
     * Validate status values
     */
    _validateStatusTransition(status) {
        const validStatuses = [
            'approved', 'assigned', 'accepted', 'picked_up',
            'en_route', 'delivered', 'unpaid', 'paid'
        ];

        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
    }

    /**
     * Validate status flow logic
     */
    _validateStatusFlow(currentStatus, newStatus) {
        const statusFlow = {
            'approved': ['assigned'],
            'assigned': ['accepted'],
            'accepted': ['picked_up'],
            'picked_up': ['en_route'],
            'en_route': ['delivered'],
            'delivered': ['unpaid'],
            'unpaid': ['paid'],
            'paid': [] // Terminal status
        };

        const allowedNext = statusFlow[currentStatus] || [];
        if (!allowedNext.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }

    /**
     * Check if BoL exists
     */
    async _bolExists(ctx, bolNumber) {
        const bolBytes = await ctx.stub.getState(bolNumber);
        return bolBytes && bolBytes.length > 0;
    }

    /**
     * Update contract statistics
     */
    async _updateContractStats(ctx, action) {
        const infoBytes = await ctx.stub.getState('CONTRACT_INFO');
        if (infoBytes && infoBytes.length > 0) {
            const info = JSON.parse(infoBytes.toString());

            if (action === 'bolCreated') {
                info.totalBols = (info.totalBols || 0) + 1;
            }

            const txTimestamp = ctx.stub.getTxTimestamp();
            info.lastUpdated = new Date(txTimestamp.seconds.toInt() * 1000).toISOString();
            await ctx.stub.putState('CONTRACT_INFO', Buffer.from(JSON.stringify(info)));
        }
    }

    /**
     * Helper to get all results from iterator
     */
    async _getAllResults(iterator) {
        const results = [];
        while (true) {
            const result = await iterator.next();
            if (result.value && result.value.value.toString()) {
                try {
                    results.push({
                        key: result.value.key,
                        record: JSON.parse(result.value.value.toString())
                    });
                } catch (err) {
                    console.warn(`Failed to parse record: ${err.message}`);
                }
            }
            if (result.done) {
                await iterator.close();
                break;
            }
        }
        return results;
    }
}

module.exports = LoadBlockContract;