#!/bin/bash

# LoadBlock Hyperledger Fabric Network Startup Script
# This script starts the Fabric network using Docker Compose

set -e

echo "Starting LoadBlock Hyperledger Fabric Network..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

# Check if crypto material exists
if [ ! -d "crypto-config" ]; then
    echo "ERROR: Crypto material not found. Please run './scripts/setup-network.sh' first"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker first"
    exit 1
fi

echo "Cleaning up existing containers and volumes..."

# Stop and remove existing containers
docker-compose down --volumes --remove-orphans

# Remove any dangling containers
docker container prune -f

echo "Starting Fabric network containers..."

# Start the network
docker-compose up -d

echo "Waiting for containers to be ready..."

# Wait for containers to start
sleep 10

# Check container status
echo "Container status:"
docker-compose ps

# Check if all services are healthy
echo "Checking service health..."

# Function to check if a port is open
check_port() {
    local host=$1
    local port=$2
    local service=$3

    for i in {1..30}; do
        if nc -z $host $port 2>/dev/null; then
            echo "SUCCESS: $service is ready on $host:$port"
            return 0
        fi
        echo "Waiting for $service ($i/30)..."
        sleep 2
    done
    echo "ERROR: $service failed to start on $host:$port"
    return 1
}

# Check services
check_port localhost 7050 "Orderer"
check_port localhost 7051 "Peer0"
check_port localhost 8051 "Peer1"
check_port localhost 7054 "CA"

echo "LoadBlock Fabric network is running!"
echo ""
echo "Network endpoints:"
echo "Certificate Authority: http://localhost:7054"
echo "Orderer: localhost:7050"
echo "Peer0: localhost:7051"
echo "Peer1: localhost:8051"
echo ""
echo "Next steps:"
echo "1. Run './scripts/create-channel.sh' to create the LoadBlock channel"
echo "2. Run './scripts/test-network.sh' to test network connectivity"
echo ""
echo "To view logs: docker-compose logs -f [service_name]"
echo "To stop network: docker-compose down"