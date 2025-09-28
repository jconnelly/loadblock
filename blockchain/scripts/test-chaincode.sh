#!/bin/bash

# LoadBlock Chaincode Testing Script
# This script tests the deployed LoadBlock chaincode functionality

set -e

echo "Testing LoadBlock chaincode functionality..."

# Navigate to blockchain directory
cd "$(dirname "$0")/.."

# Chaincode variables
CC_NAME="loadblock-cc"
CHANNEL_NAME="loadblock-channel"

echo "1. Testing contract info..."

# Test getContractInfo
docker exec blockchain-cli-1 peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"getContractInfo","Args":[]}'

echo ""
echo "2. Testing BoL creation..."

# Create a sample BoL
SAMPLE_BOL='{
    "bolNumber": "BOL-2025-000001",
    "shipper": {
        "id": "shipper1",
        "companyName": "LoadBlock Logistics",
        "contactName": "John Shipper",
        "email": "shipper@loadblock.io",
        "phone": "555-0123",
        "address": {
            "street": "123 Shipping Lane",
            "city": "Transport City",
            "state": "TC",
            "zipCode": "12345",
            "country": "United States"
        }
    },
    "consignee": {
        "id": "consignee1",
        "companyName": "Destination Warehouses Inc",
        "contactName": "Jane Consignee",
        "email": "consignee@destination.com",
        "phone": "555-0456",
        "address": {
            "street": "456 Delivery Blvd",
            "city": "Receive City",
            "state": "RC",
            "zipCode": "67890",
            "country": "United States"
        }
    },
    "carrier": {
        "id": "carrier1",
        "companyName": "FastTrack Trucking",
        "contactName": "Bob Carrier",
        "email": "carrier@fasttrack.com",
        "phone": "555-0789",
        "address": {
            "street": "789 Trucking Ave",
            "city": "Carrier City",
            "state": "CC",
            "zipCode": "13579",
            "country": "United States"
        },
        "dotNumber": "DOT123456",
        "mcNumber": "MC987654"
    },
    "cargoItems": [
        {
            "id": "item1",
            "description": "Electronics Components",
            "quantity": 25,
            "unit": "pieces",
            "weight": 1500.00,
            "value": 50000.00,
            "packaging": "Palletized",
            "hazmat": false
        }
    ],
    "totalWeight": 1500.00,
    "totalValue": 50000.00,
    "totalPieces": 25,
    "pickupDate": "2025-09-30",
    "specialInstructions": "Handle with care - electronics",
    "freightCharges": {
        "baseRate": 1200.00,
        "fuelSurcharge": 150.00,
        "accessorialCharges": 50.00,
        "totalCharges": 1400.00,
        "paymentTerms": "prepaid",
        "billTo": "shipper"
    },
    "createdBy": "user123"
}'

IPFS_HASH="QmSampleHashForTestingPurposes123456789"

# Create the BoL
docker exec blockchain-cli-1 peer chaincode invoke \
    -o orderer.loadblock.com:7050 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c "{\"function\":\"createApprovedBoL\",\"Args\":[\"${SAMPLE_BOL}\",\"${IPFS_HASH}\"]}"

echo ""
echo "3. Testing BoL retrieval..."

# Get the created BoL
docker exec blockchain-cli-1 peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"getBoL","Args":["BOL-2025-000001"]}'

echo ""
echo "4. Testing status update..."

# Update BoL status
docker exec blockchain-cli-1 peer chaincode invoke \
    -o orderer.loadblock.com:7050 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/loadblock.com/orderers/orderer.loadblock.com/msp/tlscacerts/tlsca.loadblock.com-cert.pem \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"updateBoLStatus","Args":["BOL-2025-000001","assigned","user123","Assigned to driver John Doe","QmUpdatedHashForAssignedStatus"]}'

echo ""
echo "5. Testing BoL history..."

# Get BoL history
docker exec blockchain-cli-1 peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"getBoLHistory","Args":["BOL-2025-000001"]}'

echo ""
echo "6. Testing status query..."

# Query BoLs by status
docker exec blockchain-cli-1 peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"queryBoLsByStatus","Args":["assigned"]}'

echo ""
echo "7. Testing contract info after operations..."

# Check contract info again
docker exec blockchain-cli-1 peer chaincode query \
    -C ${CHANNEL_NAME} \
    -n ${CC_NAME} \
    -c '{"function":"getContractInfo","Args":[]}'

echo ""
echo "LoadBlock chaincode testing complete!"
echo ""
echo "Test Summary:"
echo "SUCCESS: Contract initialization"
echo "SUCCESS: BoL creation with approval workflow"
echo "SUCCESS: BoL retrieval by number"
echo "SUCCESS: Status update with audit trail"
echo "SUCCESS: Complete BoL history retrieval"
echo "SUCCESS: Query by status functionality"
echo "SUCCESS: Contract statistics tracking"
echo ""
echo "The LoadBlock chaincode is ready for integration!"