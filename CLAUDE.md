# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoadBlock is a blockchain-based Bill of Lading (BoL) management system for the trucking industry. The application uses Hyperledger Fabric for immutable document storage and IPFS for PDF document management. The system targets shippers, carriers, consignees, and brokers with a focus on eliminating paper-based inefficiencies and providing a single source of truth for shipping documents.

## Current Development Status

**Phase 1 Progress: Week 3 Complete (75% of Phase 1)**
- ✅ **Week 1**: Project setup, documentation, CI/CD pipeline, development standards
- ✅ **Week 2**: Database foundation, backend API, authentication system, role-based middleware
- ✅ **Week 3**: Frontend foundation with React.js and Material-UI **COMPLETE**
- 📋 **Week 4**: Basic BoL operations and testing framework (Next)

**Key Achievements:**
- Complete PostgreSQL database schema with migrations
- JWT-based authentication system with bcrypt password hashing
- Express.js API with comprehensive error handling and security
- Role-based access control middleware
- CI/CD pipeline with GitHub Actions
- Development standards and code quality tools (ESLint, Prettier)
- **NEW:** Complete React.js frontend with Material-UI and LoadBlock branding
- **NEW:** Authentication components with login/register forms
- **NEW:** Protected routes and role-based navigation
- **NEW:** Responsive dashboard layout with role-specific features
- **NEW:** Full frontend-backend integration with mock API
- **NEW:** Comprehensive testing framework with 9 passing tests

## Architecture Overview

**Technology Stack:**
- Frontend: React.js with Material-UI, LoadBlock branding colors (#0D47A1, #FF9800, #212121, #1976D2)
- Backend: Node.js/Express with JWT authentication and bcrypt
- Database: PostgreSQL for user/contact data with comprehensive schema
- Blockchain: AWS Managed Blockchain (Hyperledger Fabric) - *Phase 2*
- Storage: IPFS on AWS EC2 instances - *Phase 2*
- Deployment: Docker containers with AWS cloud deployment

**Core Architecture Principles:**
- Every BoL status change creates a new immutable version on the blockchain
- PDF documents are stored on IPFS with content hashes recorded on Hyperledger Fabric
- Multi-role user system with hierarchical permissions: Admin > Carrier > Shipper > Broker > Consignee
- No deletion allowed - blockchain ensures complete audit trail

## Current Implementation Status

### ✅ Completed Backend Infrastructure
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

### 📋 Next Implementation Phase (Week 4)
- **Basic BoL Operations**: BoL creation and management components
- **Database Integration**: Connect to real PostgreSQL backend
- **Advanced Forms**: Multi-step BoL creation with validation
- **Enhanced Testing**: Expanded test coverage for BoL operations

## Key Business Logic

**BoL Status Flow:** Pending → Approved → Assigned → Accepted → Picked Up → En Route → Delivered → Unpaid → Paid

**User Roles & Permissions:**
- **Carriers**: Primary status managers, can update most BoL statuses
- **Shippers**: Can create BoLs and approve initial details
- **Consignees**: Can confirm delivery status
- **Brokers**: Coordination and tracking capabilities
- **Admin**: Full system access except cannot modify blockchain records

**BoL Numbering Format:** `BOL-YYYY-NNNNNN` (will be implemented in Phase 1 Week 4)

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
│   │   ├── pages/         # Page components (login, register, dashboard)
│   │   ├── hooks/         # Custom hooks (useAuth)
│   │   ├── services/      # API services (authService)
│   │   ├── types/         # TypeScript type definitions
│   │   ├── test/          # Testing utilities and setup
│   │   └── utils/         # Utility functions
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

### Other Routes 📋 PLACEHOLDER
- `GET /api/v1/users/profile` - User profile management
- `GET /api/v1/contacts` - Contact management (Week 3)
- `GET /api/v1/bol` - BoL operations (Week 4)
- `GET /api/v1/admin/system-status` - Admin functions

## Testing Strategy ✅ CONFIGURED

**Testing Framework:**
- Jest for backend unit and integration tests
- Supertest for API endpoint testing
- Vitest + React Testing Library for frontend ✅ ACTIVE (9 tests passing)
- Coverage threshold: 80% minimum

**Current Test Status:**
- Frontend Tests: 9 passing (LoginForm validation, App routing)
- Test Suites: 2 passing (components and app tests)
- Test Coverage: Authentication components and form validation

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

**Phase 1 Focus (Week 4 - Final):**
- ✅ Solid foundation with authentication and database design (Weeks 1-2)
- ✅ Material-UI integration with LoadBlock branding (Week 3)
- 📋 Basic BoL CRUD operations without blockchain (Week 4)
- ✅ Comprehensive testing and documentation framework

**Phase 2 Integration (Weeks 5-8):**
- Hyperledger Fabric network implementation
- IPFS document storage integration
- Blockchain-based BoL versioning
- Professional PDF generation

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

This CLAUDE.md file reflects the current state as of Week 3 completion and will be updated as development progresses through the remaining phases.

## Week 3 Summary ✅ COMPLETE

**Major Deliverables Achieved:**
- Complete React.js application with TypeScript and Vite
- Material-UI theme with LoadBlock branding (#0D47A1, #FF9800, #212121, #1976D2)
- Authentication system with login/register forms and validation
- Protected routes with role-based navigation guards
- Responsive dashboard layout with sidebar navigation
- Frontend-backend integration with mock API server
- Comprehensive testing framework with 9 passing tests
- Context-based state management for authentication
- Professional component architecture with separation of concerns

**Technical Implementation:**
- Frontend: http://localhost:3000 (Vite + React + Material-UI)
- Backend: http://localhost:3001 (Mock API with test users)
- Testing: Vitest + React Testing Library (9/9 tests passing)
- Authentication flow: JWT tokens + refresh mechanism + role-based permissions

The application is now ready for Week 4 development, focusing on BoL operations and real backend integration.