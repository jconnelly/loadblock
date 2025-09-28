#!/bin/bash

# LoadBlock Network Shutdown Script
# This script safely stops and cleans up the Fabric network

set -e

echo "Stopping LoadBlock Hyperledger Fabric Network..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

echo "Current container status:"
docker-compose ps

echo ""
echo "Stopping containers gracefully..."

# Stop the network
docker-compose down

echo "Cleaning up volumes and orphaned containers..."

# Clean up volumes and orphaned containers
docker-compose down --volumes --remove-orphans

echo "Removing network-specific containers..."

# Remove any containers that might still be running
docker container prune -f

echo "Cleaning up unused networks..."

# Clean up Docker networks (be careful not to remove other networks)
docker network ls | grep loadblock && docker network rm loadblock-network || echo "Network already removed"

echo "Cleaning up unused volumes..."

# Clean up volumes (optional - uncomment if you want to remove all data)
# docker volume prune -f

echo "Optional cleanup commands (run manually if needed):"
echo "  Remove all unused volumes: docker volume prune -f"
echo "  Remove unused images: docker image prune -f"
echo "  Remove crypto material: rm -rf crypto-config config"
echo ""

echo "LoadBlock Fabric network stopped successfully!"
echo ""
echo "To restart the network:"
echo "1. ./scripts/start-network.sh"
echo "2. ./scripts/create-channel.sh (if crypto material was removed)"
echo ""
echo "To completely reset the network:"
echo "1. rm -rf crypto-config config"
echo "2. ./scripts/setup-network.sh"
echo "3. ./scripts/start-network.sh"
echo "4. ./scripts/create-channel.sh"