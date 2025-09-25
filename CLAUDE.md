# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LoadBlock is a blockchain-based Bill of Lading (BoL) management system for the trucking industry. The application uses Hyperledger Fabric for immutable document storage and IPFS for PDF document management. The system targets shippers, carriers, consignees, and brokers with a focus on eliminating paper-based inefficiencies and providing a single source of truth for shipping documents.

## Architecture Overview

**Technology Stack:**
- Frontend: React.js with Material-UI, LoadBlock branding colors (#0D47A1, #FF9800, #212121, #1976D2)
- Backend: Node.js/Express with JWT authentication and bcrypt
- Blockchain: AWS Managed Blockchain (Hyperledger Fabric)
- Storage: IPFS on AWS EC2 instances
- Database: PostgreSQL (for user/contact data), with blockchain for BoL immutable storage

**Core Architecture Principles:**
- Every BoL status change creates a new immutable version on the blockchain
- PDF documents are stored on IPFS with content hashes recorded on Hyperledger Fabric
- Multi-role user system with hierarchical permissions: Admin > Carrier > Shipper > Broker > Consignee
- No deletion allowed - blockchain ensures complete audit trail

## Key Business Logic

**BoL Status Flow:** Pending → Approved → Assigned → Accepted → Picked Up → En Route → Delivered → Unpaid/Invoiced → Paid

**User Roles & Permissions:**
- **Carriers**: Primary status managers, can update most BoL statuses
- **Shippers**: Can create BoLs and approve initial details
- **Consignees**: Read-only access to relevant BoLs
- **Brokers**: Read-only visibility for assigned BoLs
- **Admin**: Full access except cannot modify blockchain records

**BoL Numbering Format:** `[CompanyAbbrev]-[RandomID]-[MMDDYYYYHHMM].pdf`

## Development Commands

*Note: This project is currently in planning phase. Commands will be added as development infrastructure is implemented.*

**Planned Development Stack:**
```bash
# Frontend (React)
npm start                    # Development server
npm run build               # Production build
npm run test                # Run tests
npm run lint                # ESLint

# Backend (Node.js)
npm run dev                 # Development with nodemon
npm run start              # Production server
npm run test               # Jest tests

# Full Stack (Docker)
docker-compose up -d       # Start all services
docker-compose down        # Stop all services
```

## Project Structure (Planned)

```
loadblock/
├── frontend/              # React application
├── backend/               # Node.js/Express API
├── blockchain/            # Hyperledger Fabric network configs
├── ipfs/                  # IPFS node configuration
├── infrastructure/        # AWS deployment (Terraform/CloudFormation)
├── docs/                  # Requirements and specifications
└── original_loadblock_app/# Reference implementation
```

## Important Implementation Details

**BoL Document Structure:**
- Uses standardized industry format with comprehensive field set
- Multi-row cargo table supporting professional logistics requirements
- Digital signatures for Shipper, Carrier, and Consignee
- Hazardous materials flagging with compliance considerations

**Blockchain Integration:**
- Each status change triggers new blockchain transaction
- IPFS content hash stored on Hyperledger Fabric
- Version history maintained through blockchain immutability
- AWS Managed Blockchain for production deployment

**Contact Management:**
- Private contact lists per user
- Auto-population based on partial company name matching
- Role-based contact suggestions during BoL creation

**Authentication:**
- Default admin credentials: admin@loadblock.io / 12345678
- JWT-based session management with role-based access control
- Auto-population of BoL fields based on logged-in user role

## Reference Documents

Key documentation available in `/docs`:
- `Comprehensive LoadBlock PRD.pdf`: Complete product requirements
- `Bill of Lading Document Examples.pdf`: Standardized BoL format specification
- `LoadBlock Competitive Landscape Analysis_.pdf`: Market positioning
- `BillOfLading_27.pdf`: Reference BoL format
- `/original_loadblock_app`: Previous implementation for UI/UX reference

## Development Notes

- Use Material-UI components consistently with LoadBlock color scheme
- Implement blockchain integration from day one (not mock-first approach)
- PDF generation must follow industry-standard BoL format
- All cargo-related data supports multi-item entries in professional table format
- AI chatbot "Loader" for user assistance (rule-based for MVP)