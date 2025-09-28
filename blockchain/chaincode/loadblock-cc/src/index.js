'use strict';

/**
 * LoadBlock Chaincode Entry Point
 *
 * This file serves as the main entry point for the LoadBlock smart contract.
 * It exports the LoadBlockContract class which handles all Bill of Lading
 * operations on the Hyperledger Fabric blockchain.
 */

const LoadBlockContract = require('./loadblock-chaincode');

module.exports.LoadBlockContract = LoadBlockContract;
module.exports.contracts = [LoadBlockContract];