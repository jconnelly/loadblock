#!/bin/bash

# LoadBlock Hyperledger Fabric Network Setup Script
# This script generates certificates and configures the network

set -e

echo "Setting up LoadBlock Hyperledger Fabric Network..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

# Ensure we have the required binaries
if [ ! -f "./bin/cryptogen" ]; then
    echo "ERROR: Fabric binaries not found. Please run './scripts/install-fabric.sh' first"
    exit 1
fi

# Add bin directory to PATH
export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/network

echo "Generating certificates and keys..."

# Generate crypto material using cryptogen
if [ -d "crypto-config" ]; then
    echo "Removing existing crypto material..."
    rm -rf crypto-config
fi

cryptogen generate --config=./network/crypto-config.yaml --output=crypto-config

echo "Creating channel artifacts..."

# Create channel artifacts directory
mkdir -p config

# Generate genesis block
configtxgen -profile LoadBlockOrdererGenesis -channelID system-channel -outputBlock ./config/genesis.block

# Generate channel configuration transaction
configtxgen -profile LoadBlockChannel -outputCreateChannelTx ./config/loadblock-channel.tx -channelID loadblock-channel

# Generate anchor peer update for LoadBlock organization
configtxgen -profile LoadBlockChannel -outputAnchorPeersUpdate ./config/LoadBlockMSPanchors.tx -channelID loadblock-channel -asOrg LoadBlockMSP

echo "Setting up Certificate Authority..."

# Create CA private key and certificate
CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/loadblock.com/ca && ls *_sk)
cp crypto-config/peerOrganizations/loadblock.com/ca/${CA_PRIVATE_KEY} crypto-config/peerOrganizations/loadblock.com/ca/ca.loadblock.com-key.pem
cp crypto-config/peerOrganizations/loadblock.com/ca/ca.loadblock.com-cert.pem crypto-config/peerOrganizations/loadblock.com/ca/

echo "Network setup complete!"
echo ""
echo "Generated artifacts:"
echo "📁 crypto-config/ - Certificate authorities and MSP configurations"
echo "📁 config/ - Channel genesis block and configuration transactions"
echo ""
echo "Next steps:"
echo "1. Run './scripts/start-network.sh' to start the Fabric network"
echo "2. Run './scripts/create-channel.sh' to create and join the channel"