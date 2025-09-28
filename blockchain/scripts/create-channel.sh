#!/bin/bash

# LoadBlock Channel Creation Script
# This script creates and configures the LoadBlock channel

set -e

echo "Creating LoadBlock channel..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

# Set environment variables for CLI
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="LoadBlockMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/crypto-config/peerOrganizations/loadblock.com/peers/peer0.loadblock.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/crypto-config/peerOrganizations/loadblock.com/users/Admin@loadblock.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Set orderer TLS settings
export ORDERER_CA=${PWD}/crypto-config/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem

echo "Creating loadblock-channel..."

# Create the channel
docker exec blockchain-cli-1 peer channel create \
    -o orderer.loadblock.com:7050 \
    -c loadblock-channel \
    -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/loadblock-channel.tx \
    --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/config/loadblock-channel.block \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem

echo "Joining peer0 to loadblock-channel..."

# Join peer0 to the channel
docker exec blockchain-cli-1 peer channel join \
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/config/loadblock-channel.block

echo "Joining peer1 to loadblock-channel..."

# Switch to peer1 and join the channel
docker exec -e CORE_PEER_ADDRESS=peer1.loadblock.com:8051 \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer1.loadblock.com/tls/ca.crt \
    blockchain-cli-1 peer channel join \
    -b /opt/gopath/src/github.com/hyperledger/fabric/peer/config/loadblock-channel.block

echo "Updating anchor peers..."

# Update anchor peers for LoadBlock organization
docker exec blockchain-cli-1 peer channel update \
    -o orderer.loadblock.com:7050 \
    -c loadblock-channel \
    -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/LoadBlockMSPanchors.tx \
    --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem

echo "Channel information:"

# List channels for peer0
echo "Peer0 channels:"
docker exec blockchain-cli-1 peer channel list

# List channels for peer1
echo "Peer1 channels:"
docker exec -e CORE_PEER_ADDRESS=peer1.loadblock.com:8051 \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer1.loadblock.com/tls/ca.crt \
    blockchain-cli-1 peer channel list

echo "LoadBlock channel setup complete!"
echo ""
echo "Channel: loadblock-channel"
echo "Peers joined: peer0.loadblock.com, peer1.loadblock.com"
echo "Anchor peers configured: peer0.loadblock.com"
echo ""
echo "Next steps:"
echo "1. Deploy chaincode with './scripts/deploy-chaincode.sh'"
echo "2. Test the network with './scripts/test-network.sh'"