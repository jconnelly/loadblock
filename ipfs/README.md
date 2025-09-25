# LoadBlock IPFS Configuration

This directory contains IPFS node configuration and deployment scripts for LoadBlock PDF document storage.

## Structure

- `config/` - IPFS node configuration files
- `docker/` - Docker configurations for IPFS deployment
- `scripts/` - IPFS management scripts
- `aws/` - AWS EC2 deployment configurations

## Local Development

### Start IPFS Node
```bash
docker-compose up ipfs
```

### Access IPFS
- API: http://localhost:5001
- Gateway: http://localhost:8080

## Production Deployment

### AWS EC2 IPFS Cluster
```bash
cd aws
./ec2-setup.sh
```

## Document Storage Flow

1. LoadBlock generates BoL PDF
2. PDF uploaded to IPFS network
3. IPFS returns content hash (CID)
4. CID stored on Hyperledger Fabric blockchain
5. Document retrieved via IPFS CID when needed

## IPFS Cluster

For production resilience:
- Multiple IPFS nodes across AWS availability zones
- IPFS Cluster for automatic content pinning
- Content replication for high availability