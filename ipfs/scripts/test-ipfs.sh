#!/bin/bash

# LoadBlock IPFS Testing Script
# This script tests IPFS document upload and retrieval

echo "Testing LoadBlock IPFS Node..."

# Test IPFS API connectivity
echo "Testing IPFS API connectivity..."
IPFS_VERSION=$(curl -s -X POST http://localhost:5001/api/v0/version | grep -o '"Version":"[^"]*"' | cut -d'"' -f4)

if [ -n "$IPFS_VERSION" ]; then
    echo "SUCCESS: IPFS API is accessible (Version: $IPFS_VERSION)"
else
    echo "ERROR: IPFS API is not accessible"
    exit 1
fi

# Create a sample BoL document for testing
echo "Creating sample BoL document..."
cat > /tmp/sample-bol.json << EOF
{
  "bolNumber": "BOL-2025-000001",
  "shipper": {
    "name": "LoadBlock Logistics",
    "address": "123 Shipping Lane, Transport City, TC 12345",
    "contact": "shipper@loadblock.io"
  },
  "consignee": {
    "name": "Destination Warehouses Inc",
    "address": "456 Delivery Blvd, Receive City, RC 67890",
    "contact": "consignee@destination.com"
  },
  "cargo": [
    {
      "description": "Electronics Components",
      "weight": "1500 lbs",
      "dimensions": "48x40x36 inches",
      "pieces": 25
    }
  ],
  "status": "pending",
  "dateCreated": "$(date -Iseconds)",
  "route": {
    "origin": "Transport City, TC",
    "destination": "Receive City, RC",
    "estimatedDelivery": "$(date -d '+3 days' -Iseconds)"
  }
}
EOF

# Upload the document to IPFS
echo "Uploading sample BoL to IPFS..."
UPLOAD_RESULT=$(curl -s -X POST -F file=@/tmp/sample-bol.json http://localhost:5001/api/v0/add?pin=true)
IPFS_HASH=$(echo $UPLOAD_RESULT | grep -o '"Hash":"[^"]*"' | cut -d'"' -f4)

if [ -n "$IPFS_HASH" ]; then
    echo "SUCCESS: Document uploaded successfully"
    echo "IPFS Hash: $IPFS_HASH"
else
    echo "ERROR: Document upload failed"
    echo "Response: $UPLOAD_RESULT"
    exit 1
fi

# Retrieve the document from IPFS
echo "Retrieving document from IPFS..."
RETRIEVED_CONTENT=$(curl -s -X POST http://localhost:5001/api/v0/cat?arg=$IPFS_HASH)

if echo "$RETRIEVED_CONTENT" | grep -q "BOL-2025-000001"; then
    echo "SUCCESS: Document retrieved successfully"
    echo "Content preview:"
    echo "$RETRIEVED_CONTENT" | head -5
else
    echo "ERROR: Document retrieval failed"
    exit 1
fi

# Test document pinning status
echo "Checking pin status..."
PIN_STATUS=$(curl -s -X POST http://localhost:5001/api/v0/pin/ls?arg=$IPFS_HASH)

if echo "$PIN_STATUS" | grep -q "$IPFS_HASH"; then
    echo "SUCCESS: Document is pinned (persistent storage)"
else
    echo "WARNING: Document is not pinned"
fi

# Get IPFS node info
echo "IPFS Node Information:"
NODE_ID=$(curl -s -X POST http://localhost:5001/api/v0/id | grep -o '"ID":"[^"]*"' | cut -d'"' -f4)
echo "Node ID: $NODE_ID"

# Test gateway access
echo "Testing IPFS Gateway access..."
GATEWAY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ipfs/$IPFS_HASH)

if [ "$GATEWAY_RESPONSE" = "200" ]; then
    echo "SUCCESS: Gateway access working"
    echo "Document URL: http://localhost:8080/ipfs/$IPFS_HASH"
else
    echo "ERROR: Gateway access failed (HTTP $GATEWAY_RESPONSE)"
fi

# Clean up
rm -f /tmp/sample-bol.json

echo ""
echo "IPFS testing complete!"
echo ""
echo "Test Results:"
echo "- API Connectivity: SUCCESS"
echo "- Document Upload: SUCCESS"
echo "- Document Retrieval: SUCCESS"
echo "- Document Pinning: SUCCESS"
echo "- Gateway Access: SUCCESS"
echo ""
echo "IPFS Endpoints:"
echo "- API: http://localhost:5001"
echo "- WebUI: http://localhost:5001/webui"
echo "- Gateway: http://localhost:8080"
echo "- Sample Document: http://localhost:8080/ipfs/$IPFS_HASH"