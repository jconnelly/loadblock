#!/bin/bash

# LoadBlock Chaincode Deployment Script
# This script packages, installs, and instantiates the LoadBlock chaincode

set -e

echo "Starting LoadBlock chaincode deployment..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

# Check if network is running
if ! docker ps | grep -q "peer0.loadblock.com"; then
    echo "ERROR: Fabric network is not running. Please start the network first."
    echo "Run: ./scripts/start-network.sh"
    exit 1
fi

# Set environment variables
export FABRIC_CFG_PATH=${PWD}/network
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="LoadBlockMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/crypto-config/peerOrganizations/loadblock.com/peers/peer0.loadblock.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/crypto-config/peerOrganizations/loadblock.com/users/Admin@loadblock.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Chaincode variables
CC_NAME="loadblock-cc"
CC_VERSION="1.0"
CC_PATH="../chaincode/loadblock-cc"
CC_LANG="node"

echo "Packaging chaincode..."

# Package the chaincode
docker exec blockchain-cli-1 peer lifecycle chaincode package /opt/gopath/src/github.com/hyperledger/fabric/peer/${CC_NAME}.tar.gz \
    --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/${CC_NAME} \
    --lang ${CC_LANG} \
    --label ${CC_NAME}_${CC_VERSION}

echo "Installing chaincode on peer0..."

# Install chaincode on peer0
docker exec blockchain-cli-1 peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/${CC_NAME}.tar.gz

echo "Installing chaincode on peer1..."

# Install chaincode on peer1
docker exec -e CORE_PEER_ADDRESS=peer1.loadblock.com:8051 \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer1.loadblock.com/tls/ca.crt \
    blockchain-cli-1 peer lifecycle chaincode install /opt/gopath/src/github.com/hyperledger/fabric/peer/${CC_NAME}.tar.gz

echo "Querying installed chaincodes..."

# Query installed chaincodes to get package ID
PACKAGE_ID=$(docker exec blockchain-cli-1 peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[0].package_id' 2>/dev/null || echo "")

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Failed to get package ID. Extracting manually..."
    PACKAGE_ID=$(docker exec blockchain-cli-1 peer lifecycle chaincode queryinstalled | grep "Package ID:" | head -1 | awk '{print $3}' | tr -d ',')
fi

echo "Package ID: $PACKAGE_ID"

if [ -z "$PACKAGE_ID" ]; then
    echo "ERROR: Could not determine package ID"
    exit 1
fi

echo "Approving chaincode for LoadBlockMSP..."

# Approve chaincode for LoadBlockMSP
docker exec blockchain-cli-1 peer lifecycle chaincode approveformyorg \
    -o orderer.loadblock.com:7050 \
    --channelID loadblock-channel \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence 1 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem

echo "Checking commit readiness..."

# Check commit readiness
docker exec blockchain-cli-1 peer lifecycle chaincode checkcommitreadiness \
    --channelID loadblock-channel \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence 1 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem \
    --output json

echo "Committing chaincode..."

# Commit chaincode
docker exec blockchain-cli-1 peer lifecycle chaincode commit \
    -o orderer.loadblock.com:7050 \
    --channelID loadblock-channel \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence 1 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem \
    --peerAddresses peer0.loadblock.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer0.loadblock.com/tls/ca.crt \
    --peerAddresses peer1.loadblock.com:8051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer1.loadblock.com/tls/ca.crt

echo "Initializing chaincode..."

# Initialize the ledger
docker exec blockchain-cli-1 peer chaincode invoke \
    -o orderer.loadblock.com:7050 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem \
    -C loadblock-channel \
    -n ${CC_NAME} \
    -c '{"function":"initLedger","Args":[]}'

echo "Testing chaincode with contract info query..."

# Test with a simple query
docker exec blockchain-cli-1 peer chaincode query \
    -C loadblock-channel \
    -n ${CC_NAME} \
    -c '{"function":"getContractInfo","Args":[]}' || echo "INFO: Contract info not yet available"

echo "LoadBlock chaincode deployment complete!"
echo ""
echo "Chaincode Details:"
echo "- Name: ${CC_NAME}"
echo "- Version: ${CC_VERSION}"
echo "- Package ID: ${PACKAGE_ID}"
echo "- Channel: loadblock-channel"
echo ""
echo "Available Functions:"
echo "- createApprovedBoL(bolData, ipfsHash)"
echo "- updateBoLStatus(bolNumber, newStatus, userId, notes, newIpfsHash)"
echo "- getBoL(bolNumber)"
echo "- getBoLHistory(bolNumber)"
echo "- queryBoLsByStatus(status)"
echo "- queryBoLsByCarrier(carrierId)"
echo "- getAllBoLs(pageSize, bookmark)"
echo "- getContractInfo()"