#!/bin/bash

# LoadBlock Network Testing Script
# This script tests basic Fabric network connectivity and functionality

set -e

echo "Testing LoadBlock Hyperledger Fabric Network..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

echo "Checking container status..."
docker-compose ps

echo ""
echo "Testing network connectivity..."

# Function to test peer connectivity
test_peer() {
    local peer_name=$1
    local peer_address=$2
    local peer_port=$3

    echo "Testing $peer_name ($peer_address:$peer_port)..."

    if nc -z $peer_address $peer_port; then
        echo "SUCCESS: $peer_name is accessible"
    else
        echo "ERROR: $peer_name is not accessible"
        return 1
    fi
}

# Test individual services
test_peer "Orderer" "localhost" "7050"
test_peer "Peer0" "localhost" "7051"
test_peer "Peer1" "localhost" "8051"
test_peer "CA" "localhost" "7054"

echo ""
echo "Testing channel connectivity..."

# Test peer channel list
echo "Testing peer0 channel membership..."
docker exec cli peer channel list || echo "ERROR: Failed to list channels for peer0"

echo "Testing peer1 channel membership..."
docker exec -e CORE_PEER_ADDRESS=peer1.loadblock.com:8051 \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/loadblock.com/peers/peer1.loadblock.com/tls/ca.crt \
    cli peer channel list || echo "ERROR: Failed to list channels for peer1"

echo ""
echo "Testing chaincode lifecycle capabilities..."

# Test chaincode query (will fail if no chaincode installed, but tests connectivity)
echo "Testing chaincode query capability..."
docker exec cli peer lifecycle chaincode queryinstalled || echo "INFO: No chaincode installed yet (expected)"

echo ""
echo "Checking container resource usage..."
docker stats --no-stream

echo ""
echo "Network summary:"
echo "==================================="
echo "Network Name: loadblock-network"
echo "Channel: loadblock-channel"
echo "Organization: LoadBlockMSP"
echo "Peers: peer0.loadblock.com, peer1.loadblock.com"
echo "Orderer: orderer.loadblock.com"
echo "CA: ca.loadblock.com"
echo ""

# Check if loadblock-channel exists
if docker exec cli peer channel list | grep -q "loadblock-channel"; then
    echo "SUCCESS: LoadBlock channel is operational"
    echo "SUCCESS: Network test PASSED"
    echo ""
    echo "Network is ready for chaincode deployment!"
else
    echo "ERROR: LoadBlock channel not found"
    echo "ERROR: Network test FAILED"
    echo ""
    echo "Please run './scripts/create-channel.sh' to create the channel"
    exit 1
fi

echo ""
echo "To view detailed logs:"
echo "docker-compose logs orderer.loadblock.com"
echo "docker-compose logs peer0.loadblock.com"
echo "docker-compose logs peer1.loadblock.com"
echo "docker-compose logs ca.loadblock.com"