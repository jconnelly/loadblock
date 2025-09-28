# LoadBlock - Product Requirements Document (Living Document)

**Version:** 1.0
**Last Updated:** September 28, 2025
**Status:** Active Development

---

## Document Overview

This is a **living document** that will be updated throughout the LoadBlock development lifecycle. All changes, features, and architectural decisions will be tracked here to maintain alignment between stakeholders and development teams.

## 1. Product Vision

**Mission:** Eliminate paper-based inefficiencies in the trucking industry by providing a blockchain-based Bill of Lading management system with immutable audit trails, professional document generation, and AI-powered optimization capabilities.

**Vision:** Become the industry standard for intelligent freight documentation, establishing LoadBlock as the trusted platform for carriers, shippers, brokers, and consignees, with AI-driven insights that transform logistics operations.

## 2. Executive Summary

LoadBlock is a comprehensive blockchain-based Bill of Lading (BoL) management platform that revolutionizes freight documentation through:
- **Immutable Document Storage** via Hyperledger Fabric blockchain
- **Decentralized File Storage** using IPFS for PDF documents
- **Professional BoL Generation** with industry-standard formatting
- **Multi-Role Access Control** supporting the entire freight ecosystem
- **Real-Time Status Tracking** through a 9-stage workflow system
- **AI-Ready Infrastructure** with data collection and API foundations for future intelligent features

## 3. Target Market

### Primary Users
1. **Carriers** - Trucking companies managing freight operations
2. **Shippers** - Companies sending goods
3. **Brokers** - Freight intermediaries
4. **Consignees** - Receiving parties
5. **System Administrators** - LoadBlock platform managers

### Market Size
- US trucking industry: $940+ billion annually
- Digital transformation opportunity in freight documentation
- Regulatory compliance requirements driving adoption

## 4. Core Features & Requirements

### 4.1 User Authentication & Authorization

#### Multi-Role System
- **Admin**: Full system permissions (cannot modify blockchain records)
- **Carrier**: Primary BoL management and status updates
- **Shipper**: BoL creation and viewing
- **Broker**: Coordination and tracking capabilities
- **Consignee**: Delivery confirmation and document access

#### Multi-Role Users
- Users can have multiple roles simultaneously
- System applies highest permission level automatically
- Role-based UI adaptation

#### Security Requirements
- JWT-based authentication
- bcrypt password hashing
- Role-based access control (RBAC)
- Session management and timeout

### 4.2 Bill of Lading Management

#### Professional BoL Format
Based on standardized industry format with:
- **Header Information**: BoL number, date, carrier details
- **Shipper/Consignee Information**: Complete contact details
- **Cargo Table**: Item descriptions, quantities, weights, values
- **Terms & Conditions**: Liability, payment terms, signatures
- **Regulatory Compliance**: DOT numbers, insurance information

#### 9-Stage Status Workflow
1. **Pending** - Initial BoL creation
2. **Approved** - Management approval received
3. **Assigned** - Driver/equipment assigned
4. **Accepted** - Driver acceptance confirmed
5. **Picked Up** - Cargo collected from shipper
6. **En Route** - In transit to destination
7. **Delivered** - Cargo delivered to consignee
8. **Unpaid** - Awaiting payment processing
9. **Paid** - Payment completed

#### Status Management Rules
- **Carriers**: Can update all statuses
- **Shippers**: Can move Pending → Approved
- **Consignees**: Can confirm Delivered status
- **Brokers**: Can coordinate and track
- **Admin**: Full visibility, limited modification

### 4.3 Blockchain Architecture

#### Hyperledger Fabric Implementation
- **Network**: LoadBlock private blockchain network
- **Channel**: Dedicated channel for BoL transactions
- **Chaincode**: Smart contracts for BoL operations
- **Consensus**: Practical Byzantine Fault Tolerance (PBFT)

#### Immutable Document Versioning
- Each status change creates new blockchain transaction
- Previous versions remain permanently accessible
- Complete audit trail for regulatory compliance
- Cryptographic integrity verification

#### Data Storage Strategy
- **Blockchain**: BoL metadata + IPFS content hashes
- **IPFS**: PDF documents with content-addressed storage
- **PostgreSQL**: User accounts and contact information

### 4.4 Document Generation

#### PDF Generation Engine
- Professional BoL templates
- Dynamic content population
- Digital signatures support
- Print-ready formatting

#### Document Retrieval
- Secure IPFS content delivery
- Version history access
- Bulk document operations
- Export capabilities

## 5. Technical Architecture

### 5.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React.js + Material-UI | User interface |
| Backend | Node.js + Express | API and business logic |
| Database | PostgreSQL | User and contact data |
| Blockchain | Hyperledger Fabric | Immutable BoL storage |
| Storage | IPFS | Decentralized document storage |
| Deployment | Docker + AWS | Container orchestration |
| Monitoring | CloudWatch | System observability |

### 5.2 Frontend Specifications

#### Design System
- **Primary Color**: #0D47A1 (LoadBlock Blue)
- **Secondary Color**: #FF9800 (Orange accent)
- **Text**: #212121 (Dark gray)
- **Links**: #1976D2 (Blue)
- **Material-UI Components**: Professional, industry-appropriate styling

#### Key Components
- Dashboard with BoL overview
- BoL creation/editing forms
- Status tracking interface
- Document viewer/downloader
- User management (Admin)
- Contact management system

### 5.3 Backend Architecture

#### API Structure
- RESTful API design
- JWT authentication middleware
- Role-based route protection
- Input validation and sanitization
- Error handling and logging

#### Core Services
- **Authentication Service**: User login/registration
- **BoL Service**: CRUD operations and workflow
- **Blockchain Service**: Fabric network integration
- **IPFS Service**: Document storage/retrieval
- **PDF Service**: Document generation
- **Notification Service**: Status change alerts

### 5.4 Blockchain Integration

#### Smart Contract Functions
```javascript
// Core chaincode functions
createBoL(bolData, ipfsHash)
updateBoLStatus(bolId, newStatus, ipfsHash)
getBoLHistory(bolId)
queryBoLsByStatus(status)
```

#### Network Configuration
- Multi-organization setup (Carriers, Shippers, etc.)
- Certificate Authority for identity management
- Peer node distribution for redundancy
- Ordering service configuration

## 6. User Experience Design

### 6.1 User Workflows

#### BoL Creation Flow
1. User logs in and navigates to "Create BoL"
2. Form completion with shipper/consignee details
3. Cargo information entry with professional table format
4. Terms and conditions specification
5. PDF preview and confirmation
6. Blockchain transaction initiation
7. IPFS document storage
8. Transaction confirmation and BoL number assignment

#### Status Update Flow
1. Authorized user selects BoL for update
2. Status change selection from valid transitions
3. Optional notes/documentation attachment
4. PDF regeneration with new status
5. New blockchain transaction creation
6. Stakeholder notifications
7. Updated document availability

### 6.2 Dashboard Features

#### Role-Specific Views
- **Carrier Dashboard**: Active shipments, status management
- **Shipper Dashboard**: Sent shipments, approval queue
- **Broker Dashboard**: Coordinated shipments, tracking overview
- **Consignee Dashboard**: Incoming deliveries, confirmation actions
- **Admin Dashboard**: System overview, user management

## 7. Development Phases

### Phase 1: Core Platform (Weeks 1-4)
- [ ] User authentication system
- [ ] Basic BoL CRUD operations
- [ ] PostgreSQL database setup
- [ ] Frontend shell with Material-UI

### Phase 2: Blockchain Integration (Weeks 5-8)
- [ ] Hyperledger Fabric network setup
- [ ] Chaincode development and testing
- [ ] IPFS integration for document storage
- [ ] PDF generation service

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Complete status workflow implementation
- [ ] Role-based access control
- [ ] Document versioning and history
- [ ] Professional BoL formatting

### Phase 4: Production Deployment (Weeks 13-16)
- [ ] AWS infrastructure setup
- [ ] Security hardening
- [ ] Performance optimization
- [ ] User acceptance testing

## 8. Success Metrics

### Technical KPIs
- System uptime > 99.5%
- Document generation < 3 seconds
- Blockchain transaction confirmation < 30 seconds
- API response time < 500ms

### Business KPIs
- User adoption rate
- BoL processing volume
- Error/dispute reduction
- Customer satisfaction scores

## 9. Risk Assessment

### Technical Risks
- Blockchain network performance
- IPFS content availability
- AWS service dependencies
- Data migration complexity

### Business Risks
- Industry adoption resistance
- Regulatory compliance changes
- Competitive market entry
- Integration complexity with existing systems

## 10. Future Roadmap

### Version 2.0 Features
- Mobile application development
- API integrations with TMS systems
- Advanced analytics and reporting
- Multi-language support

### Long-term Vision
- Industry consortium development
- Regulatory compliance automation
- AI-powered freight optimization
- International shipping support

---

## AI Integration Roadmap (Post-MVP)

LoadBlock is architecturally prepared for AI-powered features through pre-built database schema and API infrastructure. The AI roadmap includes three major pillars:

### Phase 1: Insta-Cash - Document Automation
**Target:** 3-6 months post-MVP
- **Intelligent Document Processing**: Camera-based OCR for BoL/POD scanning
- **Geofenced POD Verification**: Location-verified proof of delivery
- **Automated Factoring**: Direct API submission to factoring partners
- **Value Proposition**: Collapse payment timeline from weeks to minutes

### Phase 2: Profit-Pilot - AI Dispatcher
**Target:** 6-9 months post-MVP
- **Predictive Load Matching**: AI-recommended high-value loads
- **Dynamic Route Optimization**: Real-time fuel/traffic/profit optimization
- **Automated Backhaul Booking**: Smart return load suggestions
- **Value Proposition**: Transform route planning into profit optimization

### Phase 3: Factor-Flow - Risk & Trust Engine
**Target:** 9-12 months post-MVP
- **Carrier Performance Scoring**: Dynamic reliability metrics
- **Fraud Detection**: AI-powered transaction anomaly detection
- **Predictive Payment Analysis**: Days-to-pay forecasting for factors
- **Value Proposition**: Data-driven risk management platform

### Current AI Infrastructure Status ✅
- **Database Schema**: Performance tracking, location data, payment history tables ready
- **API Endpoints**: 10+ AI endpoint stubs implemented and documented
- **Data Collection**: Starting immediately with MVP deployment
- **Integration Points**: Clean separation allows post-MVP AI implementation

---

## Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-09-24 | Initial PRD creation with finalized architecture decisions | Development Team |
| 1.1 | 2025-09-28 | Added AI integration roadmap and infrastructure foundation | Development Team |

---

**Next Review Date:** October 8, 2025
**Document Owner:** LoadBlock Development Team
**Stakeholders:** Product Management, Engineering, Quality Assurance