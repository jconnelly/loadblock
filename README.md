# LoadBlock - Blockchain-Based Bill of Lading Management

LoadBlock is a professional Bill of Lading (BoL) management system built on Hyperledger Fabric blockchain with IPFS document storage. Designed for the trucking industry to eliminate paper-based inefficiencies and provide immutable document tracking.

## 🏗️ Architecture

- **Frontend**: React.js with Material-UI and LoadBlock branding
- **Backend**: Node.js/Express with JWT authentication
- **Blockchain**: AWS Managed Blockchain (Hyperledger Fabric)
- **Document Storage**: IPFS on AWS EC2
- **Database**: PostgreSQL for user/contact data
- **Deployment**: Docker containers with AWS cloud deployment

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd loadblock
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - IPFS Gateway: http://localhost:8080

### Default Login
- Email: `admin@loadblock.io`
- Password: `12345678`

## 📋 Core Features

### Bill of Lading Management
- **Professional BoL Format**: Industry-standard document layout
- **Multi-Item Cargo**: Professional cargo table with comprehensive fields
- **Status Tracking**: 9-stage workflow (Pending → Approved → Assigned → Accepted → Picked Up → En Route → Delivered → Unpaid → Paid)
- **Immutable History**: Every status change creates new blockchain version
- **Digital Signatures**: Shipper, Carrier, and Consignee signatures

### User Management
- **Role-Based Access**: Admin, Carrier, Shipper, Broker, Consignee
- **Contact Management**: Private contact lists with auto-suggestions
- **Multi-Role Users**: Users can have multiple roles with hierarchical permissions

### Blockchain Integration ✅ LIVE
- **Hyperledger Fabric**: Immutable BoL storage and audit trail (✅ Operational)
- **Real-Time Transactions**: BoL status updates automatically written to blockchain
- **IPFS Storage**: Decentralized PDF document storage
- **Version Control**: Complete history of all BoL changes with transaction IDs
- **Live Verification**: End-to-end blockchain transactions confirmed (October 1, 2025)
- **Production-Ready**: Ready for AWS Managed Blockchain deployment

## 🛠️ Development

### Project Structure
```
loadblock/
├── frontend/          # React application
├── backend/           # Node.js/Express API
├── blockchain/        # Hyperledger Fabric configurations
├── ipfs/             # IPFS node setup
├── infrastructure/   # AWS deployment configs
├── tests/            # Integration and E2E tests
└── docs/             # Project documentation
```

### Development Commands

**Frontend (React)**
```bash
cd frontend
npm install
npm start              # Development server
npm run build         # Production build
npm test              # Run tests
```

**Backend (Node.js)**
```bash
cd backend
npm install
npm run dev           # Development with nodemon
npm start             # Production server
npm test              # Jest tests
```

**Full Stack (Docker)**
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs backend       # View backend logs
```

**Blockchain Development (WSL2 Ubuntu)** ✅ NEW
```bash
# Prerequisites: WSL2 with Ubuntu 22.04, Docker Desktop with WSL2 backend

# 1. Install Hyperledger Fabric and samples
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh

# 2. Start Fabric test network with LoadBlock channel
cd ~/fabric-samples/test-network
./network.sh up createChannel -c loadblock-channel -ca

# 3. Deploy LoadBlock chaincode
./network.sh deployCC -ccn loadblock \
  -ccp ~/projects/loadblock/blockchain/chaincode/loadblock-cc \
  -ccl javascript -c loadblock-channel

# 4. Initialize the ledger
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C loadblock-channel -n loadblock \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  -c '{"function":"initLedger","Args":[]}'

# 5. Setup backend admin wallet
cd ~/projects/loadblock/backend
cp -r /mnt/c/Development/AI_Development/loadblock/backend ~/projects/loadblock/
npm install
node scripts/enrollAdmin.js

# 6. Start backend with blockchain integration
node src/mock-server.js

# 7. Verify blockchain (in another terminal)
cd ~/fabric-samples/test-network
peer chaincode query -C loadblock-channel -n loadblock \
  -c '{"Args":["getContractInfo"]}'
```

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env`:
- Database connection settings
- JWT authentication secrets
- Hyperledger Fabric network configuration
- IPFS connection details
- AWS credentials (for production)

### LoadBlock Branding
- Primary Blue: `#0D47A1`
- Secondary Orange: `#FF9800`
- Primary Black: `#212121`
- Accent Light Blue: `#1976D2`

## 📚 Documentation

- [Architecture Documentation](./docs/architecture/)
- [API Documentation](./docs/api/)
- [Deployment Guide](./docs/deployment/)
- [User Manual](./docs/user-guides/)

## 🚀 Deployment

### Local Development
Use Docker Compose for local development with all services.

### AWS Production Deployment
1. Configure AWS credentials
2. Deploy Managed Blockchain network
3. Set up IPFS cluster on EC2
4. Deploy application containers

See [AWS Deployment Guide](./docs/deployment/aws-deployment.md) for detailed instructions.

## 🔒 Security

- JWT-based authentication with role-based access control
- Blockchain immutability prevents document tampering
- IPFS content addressing ensures document integrity
- Input validation and XSS/CSRF protection

## 📄 License

[License information to be added]

## 🤝 Contributing

[Contributing guidelines to be added]

## 📞 Support

For support and documentation, see the `/docs` directory or contact the development team.