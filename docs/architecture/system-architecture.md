# LoadBlock System Architecture

## Overview

LoadBlock is a blockchain-based Bill of Lading management system designed to eliminate paper-based inefficiencies in the trucking industry while providing an immutable audit trail for all shipping documents.

## Core Architecture Components

### Frontend Layer
- **Technology**: React.js with Material-UI
- **Styling**: LoadBlock brand colors and professional UI
- **State Management**: React Context API
- **Authentication**: JWT-based with role-based access control

### Backend API Layer
- **Technology**: Node.js with Express.js
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: PostgreSQL for user/contact data
- **Services**: PDF generation, blockchain integration, IPFS communication

### Blockchain Layer
- **Technology**: Hyperledger Fabric (AWS Managed Blockchain)
- **Purpose**: Immutable BoL storage and version history
- **Smart Contracts**: LoadBlock chaincode for BoL operations
- **Consensus**: Practical Byzantine Fault Tolerance (PBFT)

### Storage Layer
- **Document Storage**: IPFS for PDF documents
- **Content Addressing**: IPFS CIDs stored on blockchain
- **Replication**: IPFS cluster for high availability
- **Access**: IPFS gateway for document retrieval

## Data Flow Architecture

### BoL Creation Flow
1. User creates BoL through React frontend
2. Backend validates and processes BoL data
3. PDF generated using professional BoL format
4. PDF uploaded to IPFS network
5. IPFS returns content identifier (CID)
6. BoL metadata + IPFS CID stored on Hyperledger Fabric
7. Transaction ID returned to user

### BoL Status Update Flow
1. Authorized user updates BoL status
2. Backend validates permission and status transition
3. New PDF generated with updated status
4. New PDF uploaded to IPFS (new CID)
5. New blockchain transaction created with updated data
6. Previous version remains immutable on blockchain
7. Status history maintained automatically

### Document Retrieval Flow
1. User requests BoL document
2. Backend queries blockchain for current/historical CID
3. Document retrieved from IPFS using CID
4. PDF served to user through secure endpoint

## Security Architecture

### Authentication & Authorization
- JWT-based stateless authentication
- Role-based access control (Admin > Carrier > Shipper > Broker > Consignee)
- Multi-role user support with hierarchical permissions
- Secure password storage with bcrypt

### Blockchain Security
- Cryptographic hashing ensures document integrity
- Immutable audit trail prevents tampering
- Distributed consensus prevents single points of failure
- Certificate-based identity management

### Network Security
- HTTPS/TLS encryption for all communications
- VPC isolation in AWS deployment
- Security groups and network ACLs
- API rate limiting and input validation

## Deployment Architecture

### Local Development
- Docker Compose orchestration
- Local Fabric network
- Single IPFS node
- PostgreSQL container

### AWS Production
- ECS/EKS for container orchestration
- AWS Managed Blockchain for Fabric
- IPFS cluster on EC2 instances
- RDS PostgreSQL for user data
- Application Load Balancer
- CloudWatch monitoring

## Scalability Considerations

### Horizontal Scaling
- Stateless backend API servers
- Load balancer distribution
- Database connection pooling
- IPFS cluster expansion

### Performance Optimization
- Blockchain query optimization
- IPFS content caching
- Database indexing strategy
- PDF generation optimization

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React.js + Material-UI | User interface |
| Backend | Node.js + Express | API and business logic |
| Database | PostgreSQL | User and contact data |
| Blockchain | Hyperledger Fabric | Immutable BoL storage |
| Storage | IPFS | Decentralized document storage |
| Deployment | Docker + AWS | Container orchestration |
| Monitoring | CloudWatch + Prometheus | System observability |