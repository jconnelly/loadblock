# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoadBlock is a blockchain-based Bill of Lading (BoL) management system for the trucking industry. The application uses Hyperledger Fabric for immutable document storage and IPFS for PDF document management. The system targets shippers, carriers, consignees, and brokers with a focus on eliminating paper-based inefficiencies and providing a single source of truth for shipping documents.

## Current Development Status

**Phase 1 Complete: 100% - All Objectives Achieved** ✅
- ✅ **Week 1**: Project setup, documentation, CI/CD pipeline, development standards
- ✅ **Week 2**: Database foundation, backend API, authentication system, role-based middleware
- ✅ **Week 3**: Frontend foundation with React.js and Material-UI
- ✅ **Week 4**: Complete BoL operations and testing framework

**Phase 2 Complete: 100% - Infrastructure & AI Foundation Deployed** ✅
- ✅ **Week 5**: Hyperledger Fabric network deployed and IPFS operational
- ✅ **Week 6**: PostgreSQL schema, chaincode development, and PDF service
- ✅ **Week 7**: IPFS integration and document storage workflow
- ✅ **Week 8**: Blockchain-backend integration with AI infrastructure foundation

**Phase 3 Progress: In Planning** 📋
- 📋 **Week 9**: Professional BoL Format with industry-standard templates
- 📋 **Week 10**: Complete Status Workflow Implementation
- 📋 **Week 11**: Multi-Role System & Permissions
- 📋 **Week 12**: Document Management & Versioning

**Current Status**: Phase 2 Complete - Ready for Phase 3 Advanced Features

**Key Achievements:**
- Complete PostgreSQL database schema with migrations
- JWT-based authentication system with bcrypt password hashing
- Express.js API with comprehensive error handling and security
- Role-based access control middleware
- CI/CD pipeline with GitHub Actions
- Development standards and code quality tools (ESLint, Prettier)
- Complete React.js frontend with Material-UI and LoadBlock branding
- Authentication components with login/register forms and validation
- Protected routes and role-based navigation
- Responsive dashboard layout with role-specific features
- **Complete BoL CRUD operations** with professional UI components
- **BoL creation wizard** with multi-step form validation
- **BoL listing and detail pages** with filtering and search
- **Frontend-backend integration** with working API endpoints
- **Mock API server** with sample BoL data for development
- **Comprehensive testing framework** with validation and error handling
- **Hyperledger Fabric network** fully deployed and operational
- **IPFS document storage** successfully tested with sample documents
- **LoadBlock chaincode** with complete BoL operations and status management
- **PostgreSQL schema** for pending BoL storage with comprehensive tables
- **PDF generation service** with professional BoL templates and LoadBlock branding
- **🤖 AI infrastructure foundation** with database schema and API stubs for post-MVP features
- **📬 Notification system foundation** (architecture complete, debugging in progress)

**Recent Session Progress:**
- ✅ Created 5 role-based test user accounts for comprehensive testing
- ✅ Designed comprehensive notification system architecture including:
  - NotificationProvider with React Context for global state management
  - NotificationBell component with badge counts and dropdown interface
  - BoLRejectionModal with mandatory categorized rejection reasons
  - NotificationService with API integration and real-time capabilities
  - WebSocket + polling fallback for real-time notifications
- 📋 **Current Issue**: Notification components causing React mounting failure (parked for debugging)
- ✅ Successfully isolated issue to notification file imports
- ✅ App restored to working state for user testing

## Architecture Overview

**Technology Stack:**
- Frontend: React.js with Material-UI, LoadBlock branding colors (#0D47A1, #FF9800, #212121, #1976D2)
- Backend: Node.js/Express with JWT authentication and bcrypt
- Database: PostgreSQL for **pending BoL storage** and user/contact data ✅ DEPLOYED
- Blockchain: Hyperledger Fabric for **approved BoL immutable records** ✅ DEPLOYED
- Storage: IPFS for **PDF document versioning** ✅ DEPLOYED
- AI Foundation: Database schema and API endpoints for **post-MVP AI features** ✅ READY
- Deployment: Docker containers with local development environment

**Four-Layer Hybrid Storage Architecture:**
- **PostgreSQL**: Pending/draft BoLs (mutable, collaborative editing) + AI data collection
- **Blockchain**: Approved BoLs only (immutable, audit trail, status changes)
- **IPFS**: PDF documents only (content-addressed, versioned storage)
- **AI Data Layer**: Performance metrics, location tracking, payment history (future ML training)

**Core Architecture Principles:**
- **Pending Phase**: PostgreSQL stores mutable BoL data for Shipper/Carrier collaboration
- **Approval Trigger**: Dual approval creates first blockchain record + PDF generation + IPFS storage
- **Status Updates**: Every change after approval creates new blockchain transaction + updated PDF + new IPFS hash
- **Complete Audit Trail**: Blockchain maintains history of all IPFS document versions
- **Multi-role system**: Admin > Carrier > Shipper > Broker > Consignee
- **No deletion allowed**: Blockchain ensures immutable compliance record
- **AI Data Collection**: Transparent data gathering for post-MVP intelligent features

## Current Implementation Status

### ✅ Completed Infrastructure (Phase 1 + Phase 2)

**✅ PostgreSQL Database (Ready for Pending BoLs)**
- Users, authentication, and role management
- Pending BoL storage schema implemented
- AI foundation tables: performance_metrics, carrier_locations, payment_history
- Migration system for schema updates
- Hybrid storage architecture fully prepared

**✅ Hyperledger Fabric Network (Fully Deployed)**
- Certificate Authority: ca.loadblock.com:7054
- Orderer: orderer.loadblock.com:7050 (EtcdRaft consensus)
- Peer0: peer0.loadblock.com:7051
- Peer1: peer1.loadblock.com:8051
- CLI tools container operational
- LoadBlock chaincode deployed and tested

**✅ IPFS Document Storage (Operational & Tested)**
- API: http://localhost:5001
- WebUI: http://localhost:5001/webui
- Gateway: http://localhost:8080
- PDF document workflow successfully tested
- Node ID: 12D3KooWMUbvLSf8FbXMS9SvV7LvemV3mfx1BVF1b6gsTfBickzf

**✅ Frontend Application (Complete BoL Management)**
- Authentication with login/register
- BoL CRUD operations interface
- Multi-step creation wizard
- Professional Material-UI components
- Full integration with mock backend API

**✅ Backend API Infrastructure**
- **Database Layer**: PostgreSQL with comprehensive schema including AI tables
- **Authentication**: JWT tokens with refresh mechanism and session tracking
- **API Structure**: RESTful endpoints with comprehensive error handling
- **Security**: Rate limiting, CORS, helmet security headers, input validation
- **Role-Based Access**: Complete RBAC middleware with permission checking
- **Logging**: Winston-based structured logging with request tracking
- **Testing**: Jest framework setup with coverage reporting
- **Mock API**: Development-ready mock backend for frontend integration testing

**✅ AI Infrastructure Foundation (Added Week 8)**
- **Database Schema**: AI tables for performance tracking, location data, payment history
- **API Endpoints**: 10+ stub endpoints for Profit-Pilot, Insta-Cash, Factor-Flow features
- **Zero Impact**: Stubs return mock data with no performance overhead
- **Future Ready**: Clean migration path for post-MVP AI implementation
- **Data Collection**: Infrastructure ready for immediate operational data gathering

### ✅ Completed Frontend Infrastructure
- **React.js Application**: Vite-based setup with TypeScript support
- **Material-UI Integration**: Complete theme with LoadBlock branding colors
- **Authentication System**: Login/register forms with validation and error handling
- **Protected Routes**: Role-based navigation with authentication guards
- **Responsive Layout**: AppBar, drawer navigation, and mobile-responsive design
- **Testing Framework**: Vitest setup with React Testing Library (9 tests passing)
- **State Management**: Context-based authentication state with JWT handling

### ✅ Completed BoL Management System (Phase 1 Week 4)
- **BoL Creation Wizard**: Multi-step form with comprehensive validation
  - Step 1: Basic Information (pickup/delivery dates, special instructions)
  - Step 2: Shipper & Consignee contact details with full address validation
  - Step 3: Cargo Details with dynamic item management and freight calculations
  - Step 4: Review & Submit with complete BoL preview
- **BoL Listing Page**: Professional table with statistics cards, search, and filtering
- **BoL Detail Pages**: Complete BoL viewing with status management
- **Data Validation**: Comprehensive form validation with business rules
- **API Integration**: Full CRUD operations with comprehensive backend services

### 📬 Notification System (Architecture Complete, Debugging Required)
- **NotificationProvider**: React Context for global notification state management
- **NotificationBell**: Header component with badge counts and dropdown interface
- **BoLRejectionModal**: Mandatory rejection modal with categorized reasons
  - 6 rejection categories with common reason suggestions
  - Comprehensive validation requiring detailed explanations
  - Business rule enforcement for collaborative workflow
- **NotificationService**: Complete API service with WebSocket + polling fallback
- **Real-time Capabilities**: Infrastructure for instant status change notifications
- **🚨 Current Status**: Import/syntax issues preventing React app mounting (parked for debugging)

## Key Business Logic

**BoL Status Flow:** Pending → Approved → Assigned → Accepted → Picked Up → En Route → Delivered → Unpaid → Paid

**User Roles & Permissions:**
- **Carriers**: Primary status managers, can update most BoL statuses
- **Shippers**: Can create BoLs and approve initial details
- **Consignees**: Can confirm delivery status
- **Brokers**: Coordination and tracking capabilities
- **Admin**: Full system access except cannot modify blockchain records

**BoL Numbering Format:** `BOL-YYYY-NNNNNN` (implemented with auto-generation)

## Development Commands

**Backend (Node.js)** - Currently Active
```bash
cd backend
npm install                 # Install dependencies
npm run dev                # Development with nodemon
npm run start              # Production server
npm test                   # Jest tests with coverage
npm run lint               # ESLint code quality
npm run migrate            # Run database migrations
npm run seed               # Create default admin user
```

**Frontend (React)** - ✅ ACTIVE
```bash
cd frontend
npm install                # Install dependencies
npm run dev                # Vite development server
npm run build             # Production build
npm test                  # Vitest with React Testing Library
npm run lint              # ESLint for React/TypeScript
```

**Full Stack (Docker)**
```bash
docker-compose up -d       # Start all services (Postgres, Redis, IPFS)
docker-compose down        # Stop all services
docker-compose logs backend # View backend logs
./scripts/start-local.sh   # Automated startup with health checks
```

**Database Operations**
```bash
# Run from backend directory
npm run migrate            # Apply pending migrations
npm run migrate:status     # Check migration status
node src/database/seeders/createAdminUser.js  # Create admin user
```

## Project Structure

```
loadblock/
├── frontend/              # React application ✅ COMPLETE
│   ├── src/
│   │   ├── components/    # React components (auth, layout, notifications)
│   │   │   ├── notifications/  # Notification system components (debugging)
│   │   │   │   ├── NotificationBell.tsx        # Header bell component
│   │   │   │   ├── BoLRejectionModal.tsx       # Rejection modal
│   │   │   │   └── NotificationTest.tsx        # Isolated test component
│   │   ├── pages/         # Page components (login, register, dashboard, BoL)
│   │   │   ├── BoLListPage.tsx     # BoL listing with search/filter
│   │   │   ├── CreateBoLPage.tsx   # Multi-step BoL creation wizard
│   │   │   └── BoLDetailPage.tsx   # BoL viewing and management
│   │   ├── hooks/         # Custom hooks (useAuth, useNotifications)
│   │   ├── services/      # API services (authService, bolService, notificationService)
│   │   ├── types/         # TypeScript type definitions (BoL, Contact, Notification)
│   │   ├── test/          # Testing utilities and setup
│   │   └── utils/         # Utility functions (bolValidation)
├── backend/               # Node.js/Express API ✅ COMPLETE
│   ├── src/
│   │   ├── config/        # Database connection
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── routes/        # API endpoints (including AI stubs)
│   │   ├── services/      # Business logic (AuthService, PDF)
│   │   ├── database/      # Migrations and seeders (AI schema)
│   │   ├── utils/         # Logging and utilities
│   │   └── mock-server.js # Development mock API server
├── blockchain/            # Hyperledger Fabric configs ✅ DEPLOYED
├── ipfs/                 # IPFS node setup ✅ CONFIGURED
├── infrastructure/       # AWS deployment configs
├── docs/                 # ✅ COMPLETE - Comprehensive documentation
│   ├── PRD.md             # Product Requirements Document (with AI roadmap)
│   ├── project_plan.md    # 16-week development timeline (updated)
│   ├── Architecture_Design_Document.md # (with AI components)
│   ├── HYBRID_ARCHITECTURE.md # Four-layer architecture guide
│   └── development-standards.md
└── scripts/              # ✅ COMPLETE - Dev environment automation
```

## Important Implementation Details

**Authentication System** ✅ IMPLEMENTED
- JWT access tokens (1 hour expiration) + refresh tokens (7 days)
- Password hashing with bcrypt (12 salt rounds)
- Session tracking with device/IP information
- Secure httpOnly cookies for refresh tokens
- Multi-session management and logout functionality

**Database Schema** ✅ IMPLEMENTED
- Users table with multi-role support (TEXT[] array)
- Contacts table for shipper/consignee information
- Sessions table for JWT token management and security
- **AI Foundation Tables**: performance_metrics, carrier_locations, payment_history, ai_processing_jobs
- Migration system with integrity checking and rollback support

**API Structure** ✅ IMPLEMENTED
- RESTful endpoints with consistent JSON response format
- Comprehensive error handling with custom error classes
- Role-based route protection with middleware
- Input validation using express-validator
- Request ID tracking and structured logging
- **AI API Stubs**: Future-ready endpoints with zero current impact

**Security Implementation** ✅ IMPLEMENTED
- Rate limiting (100 req/15min general, 10 req/15min auth endpoints)
- CORS configuration for frontend origin
- Helmet security headers
- SQL injection prevention with parameterized queries
- XSS protection through input validation

## Environment Configuration

**Key Environment Variables:**
```bash
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://loadblock_user:loadblock_pass@localhost:5432/loadblock_dev

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Blockchain & Storage
IPFS_HOST=localhost
IPFS_PORT=5001
FABRIC_NETWORK_NAME=loadblock-network
```

**Test User Accounts (Available for Multi-Role Testing):**
- **Admin**: `admin@loadblock.io` / `12345678` (Full system access)
- **Carrier**: `carrier@loadblock.io` / `12345678` (Primary BoL workflow manager)
- **Shipper**: `shipper@loadblock.io` / `12345678` (BoL creation and approval)
- **Broker**: `broker@loadblock.io` / `12345678` (Coordination and tracking)
- **Consignee**: `consignee@loadblock.io` / `12345678` (Delivery confirmation)

**Current Running Services:**
- **Frontend**: http://localhost:3005 (React + Material-UI) - Clean app without notifications
- **Backend**: http://localhost:3001 (Mock API Server with all test users)

## API Endpoints (Current Implementation)

### Authentication Routes ✅ COMPLETE
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - Single session logout
- `POST /api/v1/auth/logout-all` - All sessions logout
- `GET /api/v1/auth/me` - Current user profile
- `GET /api/v1/auth/verify-token` - Token validation

### BoL Management Routes ✅ COMPLETE
- `GET /api/v1/bol` - List BoLs with filtering and pagination
- `GET /api/v1/bol/:id` - Get specific BoL details
- `POST /api/v1/bol` - Create new BoL
- `PUT /api/v1/bol/:id` - Update existing BoL
- `PATCH /api/v1/bol/:id/status` - Update BoL status with workflow validation
- `DELETE /api/v1/bol/:id` - Delete BoL (soft delete)
- `GET /api/v1/bol/stats` - Get BoL statistics and metrics

### Notification Routes 📬 IMPLEMENTED (Debugging Required)
- `GET /api/v1/notifications` - Get user notifications with pagination
- `POST /api/v1/notifications` - Create new notification
- `PATCH /api/v1/notifications/:id/read` - Mark notification as read
- `PATCH /api/v1/notifications/read-all` - Mark all notifications as read
- `DELETE /api/v1/notifications/:id` - Delete notification
- `GET /api/v1/notifications/stats` - Get notification statistics
- `POST /api/v1/notifications/test` - Create test notification (development)

### AI Infrastructure Routes ✅ READY (Post-MVP Stubs)
**Profit-Pilot AI Dispatcher:**
- `GET /api/v1/ai/recommendations/loads` - AI load matching
- `POST /api/v1/ai/carrier/location` - GPS tracking for optimization
- `POST /api/v1/ai/route/optimize` - AI route optimization

**Insta-Cash Document Automation:**
- `POST /api/v1/ai/document/scan` - OCR processing
- `POST /api/v1/ai/geofence/verify` - POD verification with geofencing
- `POST /api/v1/ai/factoring/submit` - Automated factoring submission

**Factor-Flow Risk & Trust Engine:**
- `GET /api/v1/ai/performance/carrier/:id` - Performance scoring
- `POST /api/v1/ai/fraud/analyze` - Fraud detection analysis
- `GET /api/v1/ai/payment/predict/:id` - Payment prediction

**AI System Management:**
- `GET /api/v1/ai/status` - AI system status and capabilities
- `PUT /api/v1/ai/preferences` - User AI preferences

### Other Routes 📋 PLANNED
- `GET /api/v1/users/profile` - User profile management
- `GET /api/v1/contacts` - Contact management (Phase 3)
- `GET /api/v1/admin/system-status` - Admin functions

## Testing Strategy ✅ CONFIGURED

**Testing Framework:**
- Jest for backend unit and integration tests
- Supertest for API endpoint testing
- Vitest + React Testing Library for frontend ✅ ACTIVE (9 tests passing)
- Coverage threshold: 80% minimum

**Current Test Status:**
- Frontend Tests: 9 passing (LoginForm validation, App routing, BoL components)
- Backend Tests: Comprehensive API endpoint testing with mock data
- Test Coverage: Authentication components and form validation
- Integration Testing: Frontend-backend API communication

**Code Quality:**
- ESLint with custom rules for Node.js and React
- Prettier for consistent code formatting
- Pre-commit hooks for code validation
- SonarQube integration (planned)

## Development Standards ✅ IMPLEMENTED

**Coding Guidelines:**
- Comprehensive development standards document
- ESLint and Prettier configurations
- Git workflow with branch naming conventions
- Pull request templates and code review process
- Security guidelines and performance standards

## Deployment Configuration

**Local Development** ✅ READY
- Docker Compose with PostgreSQL, Redis, IPFS
- Automated setup scripts with health checking
- Environment templates and configuration guides

**CI/CD Pipeline** ✅ IMPLEMENTED
- GitHub Actions workflow with multi-stage testing
- Security analysis and dependency auditing
- Docker build testing and deployment automation
- Production deployment to AWS ECS (Phase 4)

## Reference Documents

Key documentation available in `/docs`:
- `PRD.md`: Product Requirements Document (with AI roadmap)
- `project_plan.md`: 16-week development timeline (updated with AI)
- `Architecture_Design_Document.md`: Complete technical architecture (with AI)
- `HYBRID_ARCHITECTURE.md`: Four-layer storage architecture guide
- `development-standards.md`: Coding and quality standards
- `TODO.md`: Detailed task tracking with phase breakdown

## Development Notes

**Phase 1 Complete - All Objectives Achieved:** ✅
- ✅ Solid foundation with authentication and database design (Weeks 1-2)
- ✅ Material-UI integration with LoadBlock branding (Week 3)
- ✅ Complete BoL CRUD operations without blockchain (Week 4)
- ✅ Comprehensive testing and documentation framework
- ✅ Multi-step form wizard with professional validation
- ✅ Role-based permissions and status workflow
- ✅ Integration with mock backend API for development

**Phase 2 Complete - Infrastructure & AI Foundation Deployed:** ✅
- ✅ Hyperledger Fabric network fully operational (Week 5)
- ✅ IPFS document storage tested and verified (Week 5)
- ✅ PostgreSQL schema expansion and chaincode development (Week 6)
- ✅ PDF generation service with professional templates (Week 6)
- ✅ IPFS integration and document workflow (Week 7)
- ✅ Blockchain-backend integration completed (Week 8)
- ✅ **AI Infrastructure Foundation**: Database schema + API stubs for post-MVP features (Week 8)

**Phase 3 Next - Advanced Features & Professional BoL:** 📋
- 📋 **Week 9**: Professional BoL Format with industry-standard regulatory compliance
- 📋 **Week 10**: Complete 9-Stage Status Workflow with role-based permissions
- 📋 **Week 11**: Multi-Role System & Permissions with comprehensive RBAC
- 📋 **Week 12**: Document Management & Versioning with enterprise-grade features

**Current Session Progress:**
- ✅ Successfully started servers and created 5 role-based test accounts
- ✅ Designed comprehensive notification system architecture for BoL workflow collaboration
- 📋 **Notification System Issue**: Import syntax causing React mounting failure (architecture complete, debugging needed)
- ✅ Successfully isolated problem to notification file imports
- ✅ Restored working app state for multi-role user testing
- 📋 **Next**: Resume notification system debugging or proceed with Phase 3 development

**AI Infrastructure Benefits:**
- **Zero Current Impact**: All AI endpoints return mock data
- **Future-Proof APIs**: Established contracts prevent breaking changes
- **Data Collection Ready**: Database collecting operational data from day 1
- **Competitive Advantage**: Industry-first AI-ready trucking platform

**Technical Debt Monitoring:**
- Regular dependency updates and security patches
- Performance optimization as system grows
- Code coverage maintenance above 80%
- Documentation updates with feature additions
- **Notification System**: Resolve import/syntax issues for production readiness

## Performance Targets

**Current Implementation:**
- API response time: < 500ms (95th percentile)
- Database queries: < 100ms (simple operations)
- Authentication: < 200ms (token validation)

**Future Targets (Phases 3-4):**
- PDF generation: < 3 seconds
- Blockchain transactions: < 30 seconds
- System uptime: > 99.5%

## Current Session Status

**✅ Successfully Completed:**
- Server startup and test account creation for all 5 user roles
- Comprehensive notification system architecture design
- React mounting issue debugging and isolation
- App restoration to working state for testing

**📋 Available for Testing:**
- Multi-role authentication with 5 test user accounts
- Complete BoL CRUD operations interface
- Role-based navigation and dashboard features
- Frontend-backend API integration

**🚨 Known Issues:**
- **Notification System**: Import/syntax causing React app mounting failure
  - Architecture is solid and complete
  - Components exist but cannot be imported without breaking app
  - Isolated to notification file imports, not business logic
  - **Recommendation**: Debug in dedicated session or proceed with Phase 3

**🎯 Current Focus Options:**
1. **Continue Testing**: Multi-role functionality validation with existing working app
2. **Debug Notifications**: Systematic isolation of notification import issues
3. **Phase 3 Development**: Begin advanced features with notification system integration later

This CLAUDE.md file reflects the current state as of Phase 2 completion with AI infrastructure foundation and notification system architecture complete (debugging required). Ready for Phase 3 advanced features development or notification system resolution.

The LoadBlock platform provides:
- **Complete MVP Foundation** with authentication, BoL management, and blockchain integration
- **AI-Ready Infrastructure** for post-MVP intelligent features and competitive advantage
- **Professional Development Environment** with comprehensive testing and documentation
- **Multi-Role Testing Capability** with 5 user accounts representing the entire freight ecosystem