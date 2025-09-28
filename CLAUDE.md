# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoadBlock is a blockchain-based Bill of Lading (BoL) management system for the trucking industry. The application uses Hyperledger Fabric for immutable document storage and IPFS for PDF document management. The system targets shippers, carriers, consignees, and brokers with a focus on eliminating paper-based inefficiencies and providing a single source of truth for shipping documents.

## Current Development Status

**Phase 1 Complete: 100% - All Objectives Achieved**
- ✅ **Week 1**: Project setup, documentation, CI/CD pipeline, development standards
- ✅ **Week 2**: Database foundation, backend API, authentication system, role-based middleware
- ✅ **Week 3**: Frontend foundation with React.js and Material-UI
- ✅ **Week 4**: Complete BoL operations and testing framework **COMPLETE**

**Phase 2 Progress: Week 6 In Progress (90% Week 5 Complete)**
- ✅ **Week 5**: Hyperledger Fabric network deployed and IPFS operational **COMPLETE**
- 🔄 **Week 6**: PostgreSQL schema setup for pending BoLs and chaincode development **IN PROGRESS**

**Current Focus**: Implementing hybrid storage architecture - PostgreSQL for pending BoLs, Blockchain for approved BoLs

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
- **Emoji-free backend codebase** following clean code standards

## Architecture Overview

**Technology Stack:**
- Frontend: React.js with Material-UI, LoadBlock branding colors (#0D47A1, #FF9800, #212121, #1976D2)
- Backend: Node.js/Express with JWT authentication and bcrypt
- Database: PostgreSQL for **pending BoL storage** and user/contact data ✅ DEPLOYED
- Blockchain: Hyperledger Fabric for **approved BoL immutable records** ✅ DEPLOYED
- Storage: IPFS for **PDF document versioning** ✅ DEPLOYED
- Deployment: Docker containers with local development environment

**Hybrid Storage Architecture:**
- **PostgreSQL**: Pending/draft BoLs (mutable, collaborative editing)
- **Blockchain**: Approved BoLs only (immutable, audit trail, status changes)
- **IPFS**: PDF documents only (content-addressed, versioned storage)

**Core Architecture Principles:**
- **Pending Phase**: PostgreSQL stores mutable BoL data for Shipper/Carrier collaboration
- **Approval Trigger**: Dual approval creates first blockchain record + PDF generation + IPFS storage
- **Status Updates**: Every change after approval creates new blockchain transaction + updated PDF + new IPFS hash
- **Complete Audit Trail**: Blockchain maintains history of all IPFS document versions
- **Multi-role system**: Admin > Carrier > Shipper > Broker > Consignee
- **No deletion allowed**: Blockchain ensures immutable compliance record

## Current Implementation Status

### ✅ Completed Infrastructure (Phase 1 + Phase 2 Week 5)

**✅ PostgreSQL Database (Ready for Pending BoLs)**
- Users, authentication, and role management
- Schema ready for BoL draft storage expansion
- Migration system for schema updates
- Prepared for hybrid storage architecture implementation

**✅ Hyperledger Fabric Network (Fully Deployed)**
- Certificate Authority: ca.loadblock.com:7054
- Orderer: orderer.loadblock.com:7050 (EtcdRaft consensus)
- Peer0: peer0.loadblock.com:7051
- Peer1: peer1.loadblock.com:8051
- CLI tools container operational
- Network ready for chaincode deployment

**✅ IPFS Document Storage (Operational & Tested)**
- API: http://localhost:5001
- WebUI: http://localhost:5001/webui
- Gateway: http://localhost:8080
- Sample BoL document successfully stored and retrieved
- Node ID: 12D3KooWMUbvLSf8FbXMS9SvV7LvemV3mfx1BVF1b6gsTfBickzf

**✅ Frontend Application (Complete BoL Management)**
- Authentication with login/register
- BoL CRUD operations interface
- Multi-step creation wizard
- Professional Material-UI components
- Full integration with mock backend API

**✅ Backend API Infrastructure
- **Database Layer**: PostgreSQL with users, contacts, and sessions tables
- **Authentication**: JWT tokens with refresh mechanism and session tracking
- **API Structure**: RESTful endpoints with comprehensive error handling
- **Security**: Rate limiting, CORS, helmet security headers, input validation
- **Role-Based Access**: Complete RBAC middleware with permission checking
- **Logging**: Winston-based structured logging with request tracking
- **Testing**: Jest framework setup with coverage reporting
- **Mock API**: Development-ready mock backend for frontend integration testing

### ✅ Completed Frontend Infrastructure
- **React.js Application**: Vite-based setup with TypeScript support
- **Material-UI Integration**: Complete theme with LoadBlock branding colors
- **Authentication System**: Login/register forms with validation and error handling
- **Protected Routes**: Role-based navigation with authentication guards
- **Responsive Layout**: AppBar, drawer navigation, and mobile-responsive design
- **Testing Framework**: Vitest setup with React Testing Library (9 tests passing)
- **State Management**: Context-based authentication state with JWT handling

### ✅ Completed BoL Management System (Week 4)
- **BoL Creation Wizard**: Multi-step form with comprehensive validation
  - Step 1: Basic Information (pickup/delivery dates, special instructions)
  - Step 2: Shipper & Consignee contact details with full address validation
  - Step 3: Cargo Details with dynamic item management and freight calculations
  - Step 4: Review & Submit with complete BoL preview
- **BoL Listing Page**: Professional table with statistics cards, search, and filtering
- **BoL Detail Pages**: Complete BoL viewing with status management
- **Status Workflow**: 9-stage BoL status progression with role-based permissions
- **Data Validation**: Comprehensive form validation with business rules
- **API Integration**: Full CRUD operations with mock backend for development

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
npm run dev                # Vite development server (http://localhost:3000)
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
│   │   ├── components/    # React components (auth, layout)
│   │   ├── pages/         # Page components (login, register, dashboard, BoL)
│   │   │   ├── BoLListPage.tsx     # BoL listing with search/filter
│   │   │   ├── CreateBoLPage.tsx   # Multi-step BoL creation wizard
│   │   │   └── BoLDetailPage.tsx   # BoL viewing and management
│   │   ├── hooks/         # Custom hooks (useAuth)
│   │   ├── services/      # API services (authService, bolService)
│   │   ├── types/         # TypeScript type definitions (BoL, Contact, etc.)
│   │   ├── test/          # Testing utilities and setup
│   │   └── utils/         # Utility functions (bolValidation)
├── backend/               # Node.js/Express API ✅ COMPLETE
│   ├── src/
│   │   ├── config/        # Database connection
│   │   ├── controllers/   # Route handlers (placeholder)
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic (AuthService)
│   │   ├── database/      # Migrations and seeders
│   │   ├── utils/         # Logging and utilities
│   │   └── mock-server.js # Development mock API server
├── blockchain/            # Hyperledger Fabric configs (Phase 2)
├── ipfs/                 # IPFS node setup ✅ CONFIGURED
├── infrastructure/       # AWS deployment configs
├── docs/                 # ✅ COMPLETE - Comprehensive documentation
│   ├── PRD.md             # Product Requirements Document
│   ├── project_plan.md    # 16-week development timeline
│   ├── Architecture_Design_Document.md
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
- Migration system with integrity checking and rollback support

**API Structure** ✅ IMPLEMENTED
- RESTful endpoints with consistent JSON response format
- Comprehensive error handling with custom error classes
- Role-based route protection with middleware
- Input validation using express-validator
- Request ID tracking and structured logging

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

# Future Services (Phase 2)
IPFS_HOST=localhost
IPFS_PORT=5001
FABRIC_NETWORK_NAME=loadblock-network
```

**Default Credentials:**
- Admin: `admin@loadblock.io` / `12345678`
- Carrier: `carrier@loadblock.io` / `12345678`

**Current Running Services:**
- Frontend: http://localhost:3000 (React + Material-UI)
- Backend: http://localhost:3001 (Mock API Server)

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
- `PATCH /api/v1/bol/:id/status` - Update BoL status
- `DELETE /api/v1/bol/:id` - Delete BoL (soft delete)
- `GET /api/v1/bol/stats` - Get BoL statistics and metrics

### Future Routes 📋 PLANNED
- `GET /api/v1/users/profile` - User profile management
- `GET /api/v1/contacts` - Contact management (Phase 4)
- `GET /api/v1/admin/system-status` - Admin functions

## Testing Strategy ✅ CONFIGURED

**Testing Framework:**
- Jest for backend unit and integration tests
- Supertest for API endpoint testing
- Vitest + React Testing Library for frontend ✅ ACTIVE (9 tests passing)
- Coverage threshold: 80% minimum

**Current Test Status:**
- Frontend Tests: 9 passing (LoginForm validation, App routing, BoL components)
- Test Suites: 2 passing (components and app tests)
- Test Coverage: Authentication components, form validation, and BoL functionality

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
- `PRD.md`: Product Requirements Document (finalized)
- `project_plan.md`: 16-week development timeline with phase tracking
- `Architecture_Design_Document.md`: Complete technical architecture
- `development-standards.md`: Coding and quality standards
- `TODO.md`: Detailed task tracking with phase breakdown

## Development Notes

**Phase 1 Complete - All Objectives Achieved:**
- ✅ Solid foundation with authentication and database design (Weeks 1-2)
- ✅ Material-UI integration with LoadBlock branding (Week 3)
- ✅ Complete BoL CRUD operations without blockchain (Week 4)
- ✅ Comprehensive testing and documentation framework
- ✅ Multi-step form wizard with professional validation
- ✅ Role-based permissions and status workflow
- ✅ Integration with mock backend API for development

**Phase 2 Week 5 Complete - Infrastructure Deployed:**
- ✅ Hyperledger Fabric network fully operational
- ✅ IPFS document storage tested and verified
- ✅ All infrastructure services communicating successfully
- ✅ Backend codebase cleaned of emoji characters

**Phase 2 Week 6 In Progress - Hybrid Architecture Implementation:**
- 🔄 PostgreSQL schema expansion for pending BoL storage
- 📋 LoadBlock chaincode development for approved BoLs
- 📋 PDF generation service implementation
- 📋 Blockchain-IPFS integration workflow
- 📋 Approval transition mechanism (PostgreSQL → Blockchain + IPFS)

**Phase 3.5 UI/UX Polish (Week 12.5):**
- Enhanced required field indicators (red/bold asterisks)
- Dynamic form button states (disabled until fields complete)
- Improved validation error messaging
- Professional design system refinement
- Accessibility compliance (WCAG 2.1 AA standards)

**Technical Debt Monitoring:**
- Regular dependency updates and security patches
- Performance optimization as system grows
- Code coverage maintenance above 80%
- Documentation updates with feature additions

## Performance Targets

**Current Implementation:**
- API response time: < 500ms (95th percentile)
- Database queries: < 100ms (simple operations)
- Authentication: < 200ms (token validation)

**Future Targets (Phases 2-3):**
- PDF generation: < 3 seconds
- Blockchain transactions: < 30 seconds
- System uptime: > 99.5%

This CLAUDE.md file reflects the current state as of Week 6 start (Phase 2 in progress) and will be updated as development progresses through the remaining phases.

## Phase 1 Summary ✅ COMPLETE

**Phase 1 has been successfully completed with all Week 4 objectives achieved:**

### Week 4 Deliverables Completed:
- ✅ **Complete BoL Management System**: Full CRUD operations for Bills of Lading
- ✅ **Multi-Step Creation Wizard**: Professional 4-step form with comprehensive validation
- ✅ **BoL Listing Interface**: Table with statistics, search, filtering, and pagination
- ✅ **Status Workflow**: 9-stage BoL status progression with role-based permissions
- ✅ **Data Validation**: Business rules validation with user-friendly error handling
- ✅ **API Integration**: Complete mock backend with sample data for development
- ✅ **TypeScript Types**: Comprehensive type definitions for all BoL operations
- ✅ **Professional UI**: Material-UI components with LoadBlock branding

## Phase 2 Week 5 Summary ✅ COMPLETE

**Infrastructure deployment phase completed successfully:**

### Week 5 Deliverables Completed:
- ✅ **Hyperledger Fabric Network**: Complete 4-node network with CA, Orderer, and 2 Peers
- ✅ **IPFS Document Storage**: Operational node with successful document testing
- ✅ **Network Integration**: All services communicating and ready for application integration
- ✅ **Code Quality**: Backend codebase cleaned of emoji characters for professional standards

### Infrastructure Status:
- **Fabric Network**: All containers running (ca, orderer, peer0, peer1, cli)
- **IPFS Node**: Operational with WebUI and Gateway access
- **Integration Testing**: Sample BoL document successfully stored and retrieved
- **Network Readiness**: Prepared for chaincode deployment and PDF integration

## Current Week 6 Focus: Hybrid Storage Implementation

**Implementing the three-layer architecture:**
- **PostgreSQL**: Pending BoL storage for collaborative editing
- **Blockchain**: Approved BoL immutable records and status changes
- **IPFS**: PDF document versioning and storage

The infrastructure foundation is complete and ready for the hybrid storage workflow implementation.