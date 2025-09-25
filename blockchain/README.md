# LoadBlock Blockchain Infrastructure

This directory contains the Hyperledger Fabric network configuration and smart contracts for the LoadBlock application.

## Structure

- `network/` - Fabric network configuration files
- `chaincode/` - LoadBlock smart contracts
- `scripts/` - Network management scripts
- `aws/` - AWS Managed Blockchain configurations

## Quick Start

### Local Development Network
```bash
cd scripts
./start-network.sh
```

### Deploy Chaincode
```bash
./deploy-chaincode.sh
```

### AWS Managed Blockchain
See `aws/deployment-guide.md` for production deployment instructions.

## Chaincode Functions

- `createBoL` - Create new Bill of Lading on blockchain
- `updateBoLStatus` - Update BoL status (creates new version)
- `queryBoL` - Retrieve current BoL state
- `getBoLHistory` - Get complete BoL history
- `queryBoLsByUser` - Get BoLs for specific user

## Network Configuration

The Fabric network includes:
- LoadBlock organization
- Single channel for BoL transactions
- Certificate Authority for identity management
- Orderer service for transaction ordering