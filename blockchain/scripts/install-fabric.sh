#!/bin/bash

# LoadBlock Hyperledger Fabric Installation Script
# This script downloads and installs Hyperledger Fabric prerequisites

set -e

echo "Installing Hyperledger Fabric for LoadBlock..."

# Set Fabric version
FABRIC_VERSION="2.5.4"
FABRIC_CA_VERSION="1.5.7"

# Create bin directory if it doesn't exist
mkdir -p ../bin

# Download Fabric binaries if not already present
if [ ! -f "../bin/peer" ]; then
    echo "Downloading Hyperledger Fabric binaries..."

    # For Windows (using curl)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "Detected Windows environment"
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${FABRIC_CA_VERSION}
        mv fabric-samples/bin/* ../bin/
        mv fabric-samples/config ../config
        rm -rf fabric-samples
    else
        # For Linux/Mac
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${FABRIC_CA_VERSION}
        mv fabric-samples/bin/* ../bin/
        mv fabric-samples/config ../config
        rm -rf fabric-samples
    fi
else
    echo "Fabric binaries already installed"
fi

# Download Fabric Docker images
echo "Pulling Hyperledger Fabric Docker images..."
docker pull hyperledger/fabric-peer:${FABRIC_VERSION}
docker pull hyperledger/fabric-orderer:${FABRIC_VERSION}
docker pull hyperledger/fabric-ca:${FABRIC_CA_VERSION}
docker pull hyperledger/fabric-tools:${FABRIC_VERSION}
docker pull hyperledger/fabric-ccenv:${FABRIC_VERSION}

echo "Hyperledger Fabric installation complete!"
echo ""
echo "Next steps:"
echo "1. Run './setup-network.sh' to create network configuration"
echo "2. Run './start-network.sh' to start the Fabric network"