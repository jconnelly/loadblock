/**
 * Fabric Service - Real Hyperledger Fabric Integration
 *
 * Handles actual blockchain interactions with the LoadBlock chaincode
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FabricService {
    constructor() {
        this.gateway = null;
        this.contract = null;
        this.network = null;
        this.channelName = process.env.FABRIC_CHANNEL_NAME || 'loadblock-channel';
        this.chaincodeName = 'loadblock';
    }

    /**
     * Connect to Fabric network
     */
    async connect() {
        try {
            // Determine paths based on environment
            const isWSL = process.platform === 'linux' || fs.existsSync('/mnt/c');
            const homeDir = process.env.HOME || process.env.USERPROFILE;

            // Base path to fabric-samples
            const fabricSamplesPath = isWSL
                ? path.join(homeDir, 'fabric-samples')
                : path.join('C:', 'Users', 'jerem', 'fabric-samples');

            // Load connection profile
            const ccpPath = path.resolve(__dirname, '../../config/fabric-connection.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // Load TLS certificates dynamically
            const ordererTLSPath = path.join(
                fabricSamplesPath,
                'test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'
            );
            const peerTLSPath = path.join(
                fabricSamplesPath,
                'test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
            );

            // Read and inject certificates
            ccp.orderers['orderer.example.com'].tlsCACerts.pem = fs.readFileSync(ordererTLSPath, 'utf8');
            ccp.peers['peer0.org1.example.com'].tlsCACerts.pem = fs.readFileSync(peerTLSPath, 'utf8');

            // Load wallet
            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            // Check admin identity
            const identity = await wallet.get('admin');
            if (!identity) {
                throw new Error('Admin identity not found. Run enrollAdmin.js first.');
            }

            // Connect gateway
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get network and contract
            this.network = await this.gateway.getNetwork(this.channelName);
            this.contract = this.network.getContract(this.chaincodeName);

            logger.info('Connected to Fabric network', {
                channel: this.channelName,
                chaincode: this.chaincodeName
            });

            return true;
        } catch (error) {
            logger.error('Failed to connect to Fabric network', error);
            throw error;
        }
    }

    /**
     * Ensure connection
     */
    async ensureConnection() {
        if (!this.contract) {
            await this.connect();
        }
    }

    /**
     * Create approved BoL on blockchain
     */
    async createApprovedBoL(bolData, ipfsHash = 'QmMockHash') {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction(
                'createApprovedBoL',
                JSON.stringify(bolData),
                ipfsHash
            );

            const bol = JSON.parse(result.toString());
            logger.info('Created BoL on blockchain', { bolNumber: bol.bolNumber });

            return bol;
        } catch (error) {
            logger.error('Failed to create BoL on blockchain', error);
            throw error;
        }
    }

    /**
     * Update BoL status on blockchain
     */
    async updateBoLStatus(bolNumber, newStatus, userId, notes = '', newIpfsHash = '') {
        try {
            await this.ensureConnection();

            const result = await this.contract.submitTransaction(
                'updateBoLStatus',
                bolNumber,
                newStatus,
                userId,
                notes,
                newIpfsHash
            );

            const bol = JSON.parse(result.toString());
            logger.info('Updated BoL status on blockchain', {
                bolNumber,
                newStatus,
                version: bol.version
            });

            return bol;
        } catch (error) {
            logger.error('Failed to update BoL status', error);
            throw error;
        }
    }

    /**
     * Get BoL from blockchain
     */
    async getBoL(bolNumber) {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('getBoL', bolNumber);
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to get BoL', error);
            throw error;
        }
    }

    /**
     * Get contract info
     */
    async getContractInfo() {
        try {
            await this.ensureConnection();

            const result = await this.contract.evaluateTransaction('getContractInfo');
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to get contract info', error);
            throw error;
        }
    }

    /**
     * Disconnect from network
     */
    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.gateway = null;
            this.contract = null;
            this.network = null;
            logger.info('Disconnected from Fabric network');
        }
    }
}

module.exports = new FabricService();
