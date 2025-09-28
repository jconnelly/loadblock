# LoadBlock Architecture Design Document

**Project:** LoadBlock - Blockchain-Based Bill of Lading Management System
**Version:** 1.0
**Last Updated:** September 28, 2025
**Document Owner:** Architecture Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architecture Principles](#3-architecture-principles)
4. [System Architecture](#4-system-architecture)
5. [Component Design](#5-component-design)
6. [Data Architecture](#6-data-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Performance & Scalability](#10-performance--scalability)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. Introduction

### 1.1 Purpose
This document defines the technical architecture for LoadBlock, a blockchain-based Bill of Lading management system designed to eliminate paper-based inefficiencies in the trucking industry.

### 1.2 Scope
This document covers:
- System architecture and component design
- Technology stack decisions and rationale
- Data flow and storage strategies
- Security and compliance requirements
- Deployment and operational considerations

### 1.3 Audience
- Development Team
- DevOps Engineers
- Security Team
- Product Management
- Quality Assurance

### 1.4 Architecture Goals
- **Immutability**: Blockchain-based audit trail for all BoL transactions
- **Scalability**: Support for enterprise-level freight operations
- **Security**: Role-based access with cryptographic integrity
- **Performance**: Sub-second response times for critical operations
- **Reliability**: 99.5% uptime with disaster recovery capabilities

---

## 2. System Overview

### 2.1 Business Context
LoadBlock addresses the trucking industry's reliance on paper-based documentation by providing:
- Digital Bill of Lading creation and management
- Immutable document versioning through blockchain
- Multi-stakeholder collaboration platform
- Professional document generation with industry compliance

### 2.2 System Boundary
```
┌─────────────────────────────────────────────────────────────┐
│                        LoadBlock System                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Frontend  │  │   Backend   │  │ Blockchain  │        │
│  │   (React)   │  │  (Node.js)  │  │  (Fabric)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Load Balancer│  │ PostgreSQL  │  │    IPFS     │        │
│  │    (ALB)    │  │ Database    │  │  Storage    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Key Stakeholders
- **Internal**: Carriers, Shippers, Brokers, Consignees, Administrators
- **External**: Regulatory bodies, Insurance companies, Financial institutions

---

## 3. Architecture Principles

### 3.1 Design Principles
- **Separation of Concerns**: Clear boundaries between frontend, backend, blockchain, and storage layers
- **Immutability First**: All document changes create new blockchain entries
- **Role-Based Security**: Fine-grained permissions based on user roles
- **API-First Design**: RESTful APIs for all system interactions
- **Event-Driven Architecture**: Asynchronous processing for blockchain operations

### 3.2 Technology Principles
- **Open Standards**: Use industry-standard protocols and formats
- **Cloud-Native**: Design for AWS cloud deployment from the start
- **Container-First**: Docker containerization for all components
- **Infrastructure as Code**: Terraform for reproducible deployments
- **Observability**: Comprehensive logging, monitoring, and tracing

### 3.3 Security Principles
- **Zero Trust**: Verify all requests regardless of source
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Minimum necessary permissions for all components
- **Secure by Default**: Security controls enabled by default
- **Audit Everything**: Complete audit trail for all system actions

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
                           ┌─────────────────┐
                           │   Users (Web)   │
                           └─────────┬───────┘
                                     │ HTTPS
                           ┌─────────▼───────┐
                           │ Application     │
                           │ Load Balancer   │
                           └─────────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
          ┌─────────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐
          │   Frontend      │ │  Backend   │ │  Backend    │
          │   (React)       │ │  API       │ │   API       │
          │   Container     │ │ Container  │ │  Container  │
          └─────────────────┘ └─────┬──────┘ └──────┬──────┘
                                    │               │
                              ┌─────▼─────────────────────────────┐
                              │         Backend Services          │
                              │                                   │
                              │ ┌─────────┐ ┌──────────────────┐  │
                              │ │  Auth   │ │   BoL Service    │  │
                              │ │ Service │ │                  │  │
                              │ └─────────┘ └──────────────────┘  │
                              │                                   │
                              │ ┌─────────┐ ┌──────────────────┐  │
                              │ │  PDF    │ │ Blockchain       │  │
                              │ │ Service │ │ Service          │  │
                              │ └─────────┘ └──────────────────┘  │
                              │                                   │
                              │ ┌─────────┐ ┌──────────────────┐  │
                              │ │   AI    │ │  Data Collection │  │
                              │ │ Service │ │   & Analytics    │  │
                              │ │ (Stubs) │ │    Service       │  │
                              │ └─────────┘ └──────────────────┘  │
                              └──────────┬────────────┬───────────┘
                                         │            │
                           ┌─────────────▼──┐    ┌───▼──────────────┐
                           │  PostgreSQL    │    │ Hyperledger      │
                           │  Database      │    │ Fabric Network   │
                           │                │    │                  │
                           │ • User Data    │    │ • BoL Metadata   │
                           │ • Contacts     │    │ • Version History│
                           │ • Sessions     │    │ • Audit Trail    │
                           └────────────────┘    └───┬──────────────┘
                                                     │
                                          ┌─────────▼─────────┐
                                          │   IPFS Network    │
                                          │                   │
                                          │ • PDF Documents   │
                                          │ • Content Hash    │
                                          │ • Version Control │
                                          └───────────────────┘
```

### 4.2 Layer Architecture

#### 4.2.1 Presentation Layer
- **Technology**: React.js with Material-UI
- **Responsibilities**: User interface, form validation, state management
- **Communication**: REST API calls to backend services
- **Deployment**: Static assets served via CDN

#### 4.2.2 Application Layer
- **Technology**: Node.js with Express.js framework
- **Responsibilities**: Business logic, API endpoints, authentication
- **Communication**: Database queries, blockchain transactions, IPFS operations
- **Deployment**: Container orchestration via ECS/EKS

#### 4.2.3 Service Layer
- **Authentication Service**: JWT token management and validation
- **BoL Service**: Core business logic for Bill of Lading operations
- **Blockchain Service**: Hyperledger Fabric integration
- **PDF Service**: Document generation and formatting
- **IPFS Service**: Decentralized storage operations

#### 4.2.4 Data Layer
- **PostgreSQL**: User accounts, contact information, session data
- **Hyperledger Fabric**: BoL metadata, transaction history, audit trail
- **IPFS**: PDF documents with content-addressable storage

---

## 5. Component Design

### 5.1 Frontend Components

#### 5.1.1 Application Structure
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── bol/             # BoL-specific components
│   ├── dashboard/       # Dashboard components
│   └── admin/           # Administration components
├── services/
│   ├── api.js           # API client configuration
│   ├── auth.js          # Authentication service
│   └── bol.js           # BoL-related API calls
├── context/
│   ├── AuthContext.js   # Authentication state
│   └── BolContext.js    # BoL management state
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── styles/              # Theme and styling
```

#### 5.1.2 Key Components
- **AuthProvider**: Global authentication state management
- **BolForm**: Professional BoL creation and editing
- **StatusTracker**: Visual workflow progress indicator
- **DocumentViewer**: PDF display with version history
- **RoleBasedRoute**: Access control for route protection

### 5.2 Backend Services

#### 5.2.1 API Structure
```
src/
├── controllers/
│   ├── auth.js          # Authentication endpoints
│   ├── bol.js           # BoL CRUD operations
│   ├── user.js          # User management
│   └── admin.js         # Administrative functions
├── services/
│   ├── authService.js   # Authentication logic
│   ├── bolService.js    # BoL business logic
│   ├── blockchainService.js # Fabric integration
│   ├── ipfsService.js   # IPFS operations
│   └── pdfService.js    # PDF generation
├── middleware/
│   ├── auth.js          # JWT validation
│   ├── rbac.js          # Role-based access control
│   └── validation.js    # Input validation
├── models/
│   ├── User.js          # User data model
│   ├── Contact.js       # Contact information
│   └── BillOfLading.js  # BoL data structure
└── utils/
    ├── logger.js        # Logging configuration
    └── constants.js     # Application constants
```

#### 5.2.2 Service Interfaces

**Authentication Service**
```javascript
class AuthService {
  async authenticate(email, password)
  async validateToken(token)
  async refreshToken(refreshToken)
  async revokeToken(token)
}
```

**BoL Service**
```javascript
class BolService {
  async createBoL(bolData, userRoles)
  async updateBolStatus(bolId, newStatus, userRoles)
  async getBolHistory(bolId)
  async generatePDF(bolData)
}
```

**Blockchain Service**
```javascript
class BlockchainService {
  async submitTransaction(functionName, args)
  async queryLedger(query)
  async getBolFromLedger(bolId)
  async getBolHistory(bolId)
}
```

### 5.3 Blockchain Components

#### 5.3.1 Chaincode Structure
```
chaincode/
├── lib/
│   ├── bol-contract.js      # Main BoL smart contract
│   ├── access-control.js    # Permission management
│   └── validation.js        # Data validation
├── test/
│   ├── bol-contract.test.js # Contract unit tests
│   └── integration.test.js  # Integration tests
└── index.js                 # Contract export
```

#### 5.3.2 Smart Contract Functions
```javascript
class BolContract extends Contract {
  async createBoL(ctx, bolData, ipfsHash)
  async updateBolStatus(ctx, bolId, newStatus, ipfsHash)
  async getBol(ctx, bolId)
  async getBolHistory(ctx, bolId)
  async queryBolsByStatus(ctx, status)
  async queryBolsByCarrier(ctx, carrierId)
}
```

---

## 6. Data Architecture

### 6.1 Data Storage Strategy

#### 6.1.1 Hybrid Storage Model
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │ Hyperledger     │    │      IPFS       │
│                 │    │    Fabric       │    │                 │
│ • User accounts │    │ • BoL metadata  │    │ • PDF documents │
│ • Contact info  │    │ • Version hash  │    │ • Content hash  │
│ • Session data  │    │ • Audit trail   │    │ • Distributed   │
│ • Role mappings │    │ • Immutable     │    │ • Versioned     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Application         │
                    │      Backend             │
                    │                          │
                    │ • Data aggregation       │
                    │ • Consistency management │
                    │ • Transaction coordination│
                    └──────────────────────────┘
```

#### 6.1.2 Data Distribution Rationale
- **PostgreSQL**: Fast queries, ACID compliance for user data
- **Blockchain**: Immutability, audit trail, regulatory compliance
- **IPFS**: Decentralized storage, content addressing, cost efficiency

### 6.2 Database Schema Design

#### 6.2.1 PostgreSQL Schema
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    roles TEXT[] NOT NULL, -- Array of roles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    contact_type VARCHAR(20) NOT NULL, -- 'shipper', 'consignee', etc.
    company_name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for JWT token management
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.2.2 Blockchain Data Model
```json
{
  "bolId": "BOL-2025-001234",
  "version": 1,
  "status": "pending",
  "ipfsHash": "QmHash123...",
  "metadata": {
    "carrierInfo": {
      "name": "ABC Trucking",
      "dotNumber": "123456",
      "address": "...",
      "phone": "555-0123"
    },
    "shipperInfo": {
      "name": "XYZ Manufacturing",
      "address": "...",
      "contactPerson": "John Doe"
    },
    "consigneeInfo": {
      "name": "Retail Corp",
      "address": "...",
      "contactPerson": "Jane Smith"
    },
    "cargo": [
      {
        "description": "Steel coils",
        "quantity": 5,
        "weight": "2500 lbs",
        "value": "$15000"
      }
    ]
  },
  "statusHistory": [
    {
      "status": "pending",
      "timestamp": "2025-09-24T10:00:00Z",
      "updatedBy": "user123"
    }
  ],
  "createdBy": "user123",
  "timestamp": "2025-09-24T10:00:00Z",
  "previousVersion": null
}
```

### 6.3 Data Flow Architecture

#### 6.3.1 BoL Creation Flow
```
User Input → Form Validation → Business Logic → Multi-Step Storage
    │              │                 │                  │
    │              │                 │        ┌─────────▼─────────┐
    │              │                 │        │  1. PostgreSQL   │
    │              │                 │        │     Contact      │
    │              │                 │        │     Validation   │
    │              │                 │        └─────────┬─────────┘
    │              │                 │                  │
    │              │                 │        ┌─────────▼─────────┐
    │              │                 │        │  2. PDF          │
    │              │                 │        │     Generation   │
    │              │                 │        └─────────┬─────────┘
    │              │                 │                  │
    │              │                 │        ┌─────────▼─────────┐
    │              │                 │        │  3. IPFS         │
    │              │                 │        │     Upload       │
    │              │                 │        └─────────┬─────────┘
    │              │                 │                  │
    │              │                 │        ┌─────────▼─────────┐
    │              │                 │        │  4. Blockchain   │
    │              │                 │        │     Transaction  │
    │              │                 │        └─────────┬─────────┘
    │              │                 │                  │
    │              │                 └──────────────────▼
    │              │                          Success Response
    │              └──────────────────────────────────┘
    └─────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Security Model

#### 7.1.1 Defense in Depth
```
┌─────────────────────────────────────────────────────────────┐
│                    Internet/Users                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Layer 1: Network Security                                   │
│ • WAF (Web Application Firewall)                           │
│ • DDoS Protection                                          │
│ • SSL/TLS Termination                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Layer 2: Application Load Balancer                         │
│ • Rate Limiting                                            │
│ • IP Filtering                                             │
│ • Health Checks                                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Layer 3: Application Security                              │
│ • JWT Authentication                                       │
│ • Role-Based Access Control                               │
│ • Input Validation                                        │
│ • API Security Headers                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Layer 4: Service Security                                  │
│ • Service-to-Service Authentication                        │
│ • Encryption in Transit                                   │
│ • Secrets Management                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ Layer 5: Data Security                                     │
│ • Encryption at Rest                                       │
│ • Database Access Control                                  │
│ • Blockchain Cryptographic Security                       │
│ • IPFS Content Addressing                                  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Authentication & Authorization

#### 7.2.1 JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user123",
    "email": "user@example.com",
    "roles": ["carrier", "shipper"],
    "effectiveRole": "carrier",
    "iat": 1632150000,
    "exp": 1632157200
  }
}
```

#### 7.2.2 Role-Based Permissions Matrix
| Action | Admin | Carrier | Shipper | Broker | Consignee |
|--------|-------|---------|---------|--------|-----------|
| Create BoL | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve BoL | ✓ | ✓ | ✓ | ✓ | ✗ |
| Assign Driver | ✓ | ✓ | ✗ | ✓ | ✗ |
| Update En Route | ✓ | ✓ | ✗ | ✗ | ✗ |
| Confirm Delivery | ✓ | ✓ | ✗ | ✓ | ✓ |
| View All BoLs | ✓ | ✗ | ✗ | ✗ | ✗ |
| User Management | ✓ | ✗ | ✗ | ✗ | ✗ |

### 7.3 Data Protection

#### 7.3.1 Encryption Strategy
- **In Transit**: TLS 1.3 for all communications
- **At Rest**: AES-256 encryption for database storage
- **Blockchain**: Native cryptographic hashing
- **IPFS**: Content addressing provides integrity verification

#### 7.3.2 Secrets Management
```yaml
# AWS Secrets Manager structure
secrets:
  database:
    connection_string: "postgresql://..."
    encryption_key: "base64_encoded_key"
  blockchain:
    network_config: "fabric_network_config"
    admin_private_key: "private_key_pem"
  jwt:
    signing_key: "jwt_signing_secret"
    refresh_key: "jwt_refresh_secret"
  ipfs:
    api_endpoint: "https://ipfs.api.url"
    auth_token: "ipfs_auth_token"
```

---

## 8. Integration Architecture

### 8.1 API Design

#### 8.1.1 RESTful API Structure
```
/api/v1
├── /auth
│   ├── POST /login
│   ├── POST /refresh
│   ├── POST /logout
│   └── GET /profile
├── /users
│   ├── GET /users
│   ├── POST /users
│   ├── PUT /users/:id
│   └── DELETE /users/:id
├── /contacts
│   ├── GET /contacts
│   ├── POST /contacts
│   ├── PUT /contacts/:id
│   └── DELETE /contacts/:id
├── /bol
│   ├── GET /bol
│   ├── POST /bol
│   ├── GET /bol/:id
│   ├── PUT /bol/:id/status
│   ├── GET /bol/:id/history
│   ├── GET /bol/:id/pdf
│   └── POST /bol/:id/regenerate
└── /admin
    ├── GET /admin/users
    ├── GET /admin/system-status
    └── GET /admin/audit-logs
```

#### 8.1.2 API Response Format
```json
{
  "success": true,
  "data": {
    "bol": {
      "id": "BOL-2025-001234",
      "status": "pending",
      "createdAt": "2025-09-24T10:00:00Z"
    }
  },
  "meta": {
    "version": "1.0",
    "timestamp": "2025-09-24T10:00:00Z",
    "requestId": "req-123456"
  },
  "links": {
    "self": "/api/v1/bol/BOL-2025-001234",
    "pdf": "/api/v1/bol/BOL-2025-001234/pdf",
    "history": "/api/v1/bol/BOL-2025-001234/history"
  }
}
```

### 8.2 External Integrations

#### 8.2.1 Blockchain Integration
```javascript
// Hyperledger Fabric Gateway API
const gateway = new Gateway();
await gateway.connect(connectionProfile, {
    wallet: wallet,
    identity: 'appUser',
    discovery: { enabled: true, asLocalhost: true }
});

const network = await gateway.getNetwork('loadblock-channel');
const contract = network.getContract('loadblock-cc');

// Submit transaction
const result = await contract.submitTransaction(
    'createBoL',
    JSON.stringify(bolData),
    ipfsHash
);
```

#### 8.2.2 IPFS Integration
```javascript
// IPFS HTTP Client
const ipfs = create({
    host: 'localhost',
    port: 5001,
    protocol: 'http'
});

// Add file to IPFS
const { path } = await ipfs.add({
    path: 'bol-document.pdf',
    content: pdfBuffer
});

// Retrieve file from IPFS
const chunks = [];
for await (const chunk of ipfs.cat(path)) {
    chunks.push(chunk);
}
const fileBuffer = Buffer.concat(chunks);
```

### 8.3 Event-Driven Architecture

#### 8.3.1 Event Flow
```
BoL Status Change → Event Queue → Multiple Handlers
        │                │              │
        │                │              ├── Notification Service
        │                │              ├── Audit Log Service
        │                │              ├── Analytics Service
        │                │              └── Blockchain Service
        │                │
        └── Event Store ←──┘
```

#### 8.3.2 Event Schema
```json
{
  "eventId": "evt-123456",
  "eventType": "bol.status.updated",
  "version": "1.0",
  "timestamp": "2025-09-24T10:00:00Z",
  "source": "bol-service",
  "data": {
    "bolId": "BOL-2025-001234",
    "previousStatus": "pending",
    "newStatus": "approved",
    "updatedBy": "user123",
    "ipfsHash": "QmHash123..."
  }
}
```

---

## 9. Deployment Architecture

### 9.1 AWS Cloud Architecture

#### 9.1.1 Production Environment
```
                    ┌─────────────────┐
                    │   CloudFront    │
                    │      (CDN)      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ Application     │
                    │ Load Balancer   │
                    │     (ALB)       │
                    └─────────┬───────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
    ┌───────────▼──┐ ┌───────▼──┐ ┌────────▼──┐
    │   ECS Task   │ │ ECS Task │ │ ECS Task  │
    │  AZ-1a       │ │  AZ-1b   │ │   AZ-1c   │
    │              │ │          │ │           │
    │ Frontend     │ │ Backend  │ │ Backend   │
    │ Backend      │ │ API      │ │ API       │
    └───────┬──────┘ └────┬─────┘ └─────┬─────┘
            │             │             │
            └─────────────┼─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐  ┌────────▼────────┐  ┌───▼──────┐
    │   RDS   │  │ AWS Managed     │  │   EC2    │
    │PostgreSQL│  │  Blockchain     │  │   IPFS   │
    │Multi-AZ │  │ (Hyperledger    │  │ Cluster  │
    │         │  │    Fabric)      │  │          │
    └─────────┘  └─────────────────┘  └──────────┘
```

#### 9.1.2 Infrastructure Components
- **ALB**: Application Load Balancer with SSL termination
- **ECS**: Elastic Container Service for application hosting
- **RDS**: Managed PostgreSQL with Multi-AZ deployment
- **Managed Blockchain**: Hyperledger Fabric network
- **EC2**: IPFS cluster nodes across availability zones
- **CloudWatch**: Monitoring and logging
- **VPC**: Virtual Private Cloud with security groups

### 9.2 Container Architecture

#### 9.2.1 Docker Compose (Development)
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/loadblock
      - IPFS_HOST=ipfs
    depends_on:
      - postgres
      - redis
      - ipfs

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=loadblock_dev
      - POSTGRES_USER=loadblock_user
      - POSTGRES_PASSWORD=loadblock_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - "4001:4001"
      - "5001:5001"
      - "8080:8080"
    volumes:
      - ipfs_data:/data/ipfs
```

#### 9.2.2 ECS Task Definitions
```json
{
  "family": "loadblock-backend",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "loadblock/backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:loadblock/database"
        }
      ]
    }
  ]
}
```

### 9.3 Infrastructure as Code

#### 9.3.1 Terraform Configuration
```hcl
# VPC Configuration
resource "aws_vpc" "loadblock_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "LoadBlock VPC"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "loadblock_cluster" {
  name = "loadblock-production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Managed Blockchain Network
resource "aws_managedblockchain_network" "loadblock_network" {
  name   = "LoadBlock"
  framework = "HYPERLEDGER_FABRIC"
  framework_version = "2.2"

  voting_policy {
    approval_threshold_policy {
      threshold_percentage    = 50
      proposal_duration_in_hours = 24
      threshold_comparator   = "GREATER_THAN"
    }
  }
}
```

---

## 10. Performance & Scalability

### 10.1 Performance Requirements

#### 10.1.1 Response Time Targets
- **API Response Time**: < 500ms for 95th percentile
- **PDF Generation**: < 3 seconds for standard BoL
- **Blockchain Transaction**: < 30 seconds confirmation
- **Database Queries**: < 100ms for simple queries
- **Page Load Time**: < 2 seconds first contentful paint

#### 10.1.2 Throughput Requirements
- **Concurrent Users**: 1,000 simultaneous users
- **API Requests**: 10,000 requests per minute
- **BoL Creation**: 100 BoLs per minute peak
- **Document Retrieval**: 500 PDFs per minute
- **Blockchain Transactions**: 50 transactions per minute

### 10.2 Scalability Strategy

#### 10.2.1 Horizontal Scaling
```
Load Increase → Auto Scaling Trigger → New Instance Launch
      │                    │                     │
      │         ┌──────────▼──────────┐         │
      │         │   CloudWatch        │         │
      │         │   Metrics           │         │
      │         │   - CPU > 70%       │         │
      │         │   - Memory > 80%    │         │
      │         │   - Request Count   │         │
      │         └──────────┬──────────┘         │
      │                    │                     │
      │         ┌──────────▼──────────┐         │
      │         │   Auto Scaling      │         │
      │         │   Policy            │         │
      │         │   - Scale Out: +2   │         │
      │         │   - Scale In: -1    │         │
      │         │   - Cooldown: 5min  │         │
      │         └──────────┬──────────┘         │
      │                    │                     │
      └────────────────────┼─────────────────────┘
                           │
               ┌───────────▼────────────┐
               │   ECS Service Update   │
               │   Task Count: 2 → 4    │
               │   Health Check Wait    │
               └────────────────────────┘
```

#### 10.2.2 Database Scaling
- **Read Replicas**: PostgreSQL read replicas for query distribution
- **Connection Pooling**: PgBouncer for connection management
- **Query Optimization**: Indexed queries and materialized views
- **Caching Layer**: Redis for frequently accessed data

#### 10.2.3 IPFS Scaling
- **IPFS Cluster**: Multiple nodes across availability zones
- **Content Pinning**: Strategic content replication
- **Gateway Load Balancing**: Multiple IPFS gateways
- **Caching**: CDN caching for frequently accessed documents

### 10.3 Performance Monitoring

#### 10.3.1 Key Performance Indicators
```javascript
// Application Metrics
const metrics = {
  api: {
    responseTime: 'histogram',
    requestRate: 'counter',
    errorRate: 'counter',
    activeConnections: 'gauge'
  },
  blockchain: {
    transactionTime: 'histogram',
    transactionSuccess: 'counter',
    blockTime: 'gauge'
  },
  ipfs: {
    uploadTime: 'histogram',
    downloadTime: 'histogram',
    nodeConnectivity: 'gauge'
  }
};
```

#### 10.3.2 Performance Testing Strategy
- **Load Testing**: Gradual load increase to identify limits
- **Stress Testing**: Beyond normal capacity to find breaking points
- **Spike Testing**: Sudden load increases to test elasticity
- **Volume Testing**: Large data sets to validate scalability
- **Endurance Testing**: Extended periods to identify memory leaks

---

## 11. Monitoring & Observability

### 11.1 Monitoring Strategy

#### 11.1.1 Three Pillars of Observability
```
                    ┌─────────────────┐
                    │   Observability │
                    │    Dashboard    │
                    └─────────┬───────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
    ┌───────────▼───┐ ┌──────▼──────┐ ┌────▼─────┐
    │   Metrics     │ │   Logging   │ │ Tracing  │
    │               │ │             │ │          │
    │ • CloudWatch  │ │ • ELK Stack │ │ • X-Ray  │
    │ • Custom KPIs │ │ • Centralized│ │ • APM    │
    │ • Real-time   │ │ • Structured│ │ • Request│
    │ • Alerts      │ │ • Searchable│ │   Flow   │
    └───────────────┘ └─────────────┘ └──────────┘
```

#### 11.1.2 Metrics Collection
```javascript
// Custom metrics using CloudWatch
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

const publishMetric = async (metricName, value, unit = 'Count') => {
  const params = {
    Namespace: 'LoadBlock/Application',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Dimensions: [{
        Name: 'Environment',
        Value: process.env.NODE_ENV
      }]
    }]
  };

  await cloudwatch.putMetricData(params).promise();
};

// Usage examples
await publishMetric('BolCreated', 1);
await publishMetric('ApiResponseTime', responseTime, 'Milliseconds');
await publishMetric('BlockchainTransaction', 1);
```

### 11.2 Logging Architecture

#### 11.2.1 Structured Logging
```javascript
// Winston logging configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Log entry example
logger.info('BoL created successfully', {
  bolId: 'BOL-2025-001234',
  userId: 'user123',
  ipfsHash: 'QmHash123...',
  transactionId: 'tx-789',
  responseTime: 1250,
  metadata: {
    carrier: 'ABC Trucking',
    route: 'Chicago to Detroit'
  }
});
```

#### 11.2.2 Log Aggregation
- **ELK Stack**: Elasticsearch, Logstash, Kibana for log processing
- **CloudWatch Logs**: AWS native log aggregation
- **Log Streaming**: Real-time log processing and alerting
- **Log Retention**: 90-day retention for audit compliance

### 11.3 Alerting System

#### 11.3.1 Alert Categories
```yaml
alerts:
  critical:
    - application_down
    - database_connection_failed
    - blockchain_network_unavailable
    - high_error_rate (>5%)

  warning:
    - high_response_time (>1000ms)
    - high_cpu_usage (>80%)
    - disk_space_low (<20%)
    - memory_usage_high (>85%)

  info:
    - deployment_started
    - auto_scaling_triggered
    - new_user_registration
```

#### 11.3.2 Notification Channels
- **PagerDuty**: Critical alerts for on-call engineers
- **Slack**: Warning and info alerts for development team
- **Email**: Daily/weekly summary reports
- **SMS**: Critical production issues only

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

#### 12.1.1 Data Backup Matrix
| Component | Backup Frequency | Retention | Recovery Time |
|-----------|-----------------|-----------|---------------|
| PostgreSQL | Every 6 hours | 30 days | < 15 minutes |
| Blockchain | Continuous | Permanent | < 30 minutes |
| IPFS | Daily snapshot | 90 days | < 60 minutes |
| Application Config | Daily | 30 days | < 5 minutes |
| SSL Certificates | Weekly | 1 year | < 10 minutes |

#### 12.1.2 Backup Procedures
```bash
#!/bin/bash
# PostgreSQL backup script
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  | gzip > /backups/postgresql-$(date +%Y%m%d-%H%M).sql.gz

# IPFS backup
ipfs repo gc
tar -czf /backups/ipfs-$(date +%Y%m%d).tar.gz /data/ipfs

# Upload to S3
aws s3 cp /backups/ s3://loadblock-backups/ --recursive
```

### 12.2 High Availability

#### 12.2.1 Multi-AZ Deployment
```
Primary Region (us-east-1)
├── AZ-1a: Primary application servers, RDS primary
├── AZ-1b: Secondary application servers, RDS standby
└── AZ-1c: Tertiary application servers, backup services

Secondary Region (us-west-2)
├── Disaster recovery environment
├── Cross-region RDS backup
└── S3 cross-region replication
```

#### 12.2.2 Failover Procedures
1. **Automated Failover**: RDS Multi-AZ automatic failover
2. **Manual Failover**: Cross-region disaster recovery
3. **Health Checks**: ALB health checks for instance removal
4. **Circuit Breakers**: Prevent cascade failures

### 12.3 Recovery Procedures

#### 12.3.1 Recovery Time Objectives (RTO)
- **Database Recovery**: 15 minutes (RDS failover)
- **Application Recovery**: 30 minutes (container restart)
- **Full System Recovery**: 2 hours (complete rebuild)
- **Cross-Region Recovery**: 4 hours (disaster scenario)

#### 12.3.2 Recovery Point Objectives (RPO)
- **Database**: 5 minutes (transaction log shipping)
- **Blockchain**: 0 minutes (immutable, distributed)
- **IPFS**: 24 hours (daily backups)
- **Configuration**: 24 hours (daily backups)

### 12.4 Disaster Recovery Testing

#### 12.4.1 Testing Schedule
- **Monthly**: Database failover testing
- **Quarterly**: Full DR environment validation
- **Annually**: Complete disaster recovery drill
- **Ad-hoc**: Component failure simulation

#### 12.4.2 Recovery Validation
```bash
#!/bin/bash
# DR testing checklist
echo "Starting disaster recovery validation..."

# Test database connectivity
psql -h $DR_DB_HOST -U $DB_USER -c "SELECT version();"

# Test application startup
curl -f http://$DR_ALB_URL/api/health

# Test blockchain connectivity
curl -f http://$DR_BLOCKCHAIN_URL/api/status

# Test IPFS cluster
curl -f http://$DR_IPFS_URL:5001/api/v0/id

echo "Disaster recovery validation complete"
```

---

## Document Control

### Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-24 | Architecture Team | Initial architecture design document |

### Review Schedule
- **Monthly**: Technical review for accuracy
- **Quarterly**: Architecture review for optimization opportunities
- **Annually**: Complete architecture assessment

### Approval
- **Technical Lead**: Architecture compliance
- **Security Team**: Security architecture review
- **DevOps Lead**: Deployment architecture validation
- **Product Owner**: Business requirement alignment

---

**Document Classification**: Internal
**Next Review Date**: October 24, 2025
**Document Owner**: LoadBlock Architecture Team