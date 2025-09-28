# LoadBlock Hybrid Storage Architecture

## 🎯 **Three-Layer Storage Strategy**

### **Layer 1: PostgreSQL (Mutable Collaboration)**
**Purpose**: Pending BoL storage and user management
**Status**: ✅ Deployed and operational

**Use Cases:**
- Draft BoL creation and editing
- Shipper-Carrier collaboration
- User authentication and roles
- Real-time UI updates
- Fast search and filtering

**Data Types:**
- Pending BoL drafts (editable)
- User accounts and permissions
- Session management
- Contact information

### **Layer 2: Hyperledger Fabric (Immutable Records)**
**Purpose**: Approved BoL lifecycle management
**Status**: ✅ Network deployed, ready for chaincode

**Use Cases:**
- Approved BoL immutable records
- Status change audit trail
- Multi-party consensus
- Regulatory compliance
- Digital signatures

**Data Types:**
- Approved BoL metadata
- Status change transactions
- IPFS document hashes
- User action signatures
- Timestamp records

### **Layer 3: IPFS (Document Storage)**
**Purpose**: PDF document versioning
**Status**: ✅ Deployed and tested

**Use Cases:**
- PDF document storage
- Version control for documents
- Immutable content addressing
- Distributed file access
- Historical document retrieval

**Data Types:**
- PDF files ONLY
- BoL documents (current and historical)
- Future: Invoices, receipts, other docs

## 🔄 **Complete BoL Workflow**

### **Phase 1: Collaborative Creation (PostgreSQL)**
```
1. Shipper creates draft BoL
2. Shipper invites Carrier to review
3. Both parties can edit/comment
4. Iterative collaboration
5. Both parties approve
```

**Storage**: PostgreSQL
**State**: Mutable
**Access**: Real-time collaboration

### **Phase 2: Blockchain Activation (Approval)**
```
1. Dual approval triggers blockchain
2. PDF generation from BoL data
3. First blockchain transaction
4. PDF stored on IPFS
5. BoL gets immutable ID
```

**Storage**: Blockchain + IPFS
**State**: Immutable
**Access**: Verified and timestamped

### **Phase 3: Status Lifecycle (Blockchain + IPFS)**
```
Each status change:
1. User updates status
2. New blockchain transaction
3. Updated PDF generated
4. New IPFS hash created
5. History preserved
```

**Status Flow**: Approved → Assigned → Accepted → Picked Up → En Route → Delivered → Unpaid → Paid

**Storage**: Each change creates new blockchain record + new PDF + new IPFS hash
**State**: Immutable audit trail
**Access**: Complete history available

## 📊 **Data Flow Architecture**

### **Write Operations**
```
Pending BoL: Frontend → PostgreSQL
Approved BoL: Frontend → Blockchain → IPFS
Status Update: Frontend → Blockchain → PDF Generator → IPFS
```

### **Read Operations**
```
Draft BoL: Frontend ← PostgreSQL
Active BoL: Frontend ← Blockchain (metadata) + IPFS (PDFs)
History: Frontend ← Blockchain (audit trail) + IPFS (all versions)
```

## 🎨 **UI/UX Strategy for BoL History**

### **Phase 1: Basic History (Week 6)**
**Scope**: Minimal viable history display
**Implementation**: Simple list format

**Features:**
- Text-based status history
- "Status changed to X by User Y at Timestamp Z"
- Basic blockchain transaction verification
- Proves system functionality

### **Phase 2: Enhanced History (Week 12.5 - UI Polish)**
**Scope**: Professional timeline interface
**Implementation**: Advanced Material-UI components

**Features:**
- Visual timeline with status icons
- PDF download links for each version
- Advanced filtering and search
- Mobile-responsive design
- Status change animations
- Export to Excel/CSV
- Print-friendly views

## 🔧 **Technical Benefits**

### **PostgreSQL for Collaboration**
✅ **Performance**: Sub-100ms queries for real-time UI
✅ **Flexibility**: Easy schema changes during development
✅ **Cost**: No blockchain fees for drafts
✅ **Reliability**: ACID transactions for data integrity

### **Blockchain for Immutability**
✅ **Compliance**: Regulatory audit requirements
✅ **Trust**: Multi-party verification without central authority
✅ **Legal**: Tamper-proof digital signatures
✅ **Transparency**: Complete transaction history

### **IPFS for Documents**
✅ **Immutability**: Content-addressed files cannot be altered
✅ **Efficiency**: Deduplication saves storage space
✅ **Availability**: Distributed storage prevents single points of failure
✅ **Versioning**: Every document version permanently accessible

## 🎯 **Week 6 Development Plan**

### **Core Deliverables**
1. **PostgreSQL BoL Schema**: Tables for pending BoL storage
2. **Chaincode Development**: Smart contracts for approved BoLs
3. **PDF Generation**: Convert BoL data to PDF documents
4. **Blockchain Integration**: Connect frontend to Fabric network
5. **IPFS Integration**: Store and retrieve PDF documents
6. **Basic History UI**: Simple status change display

### **Success Criteria**
- ✅ Create pending BoL in PostgreSQL
- ✅ Approve BoL creates blockchain record
- ✅ PDF generated and stored on IPFS
- ✅ Status changes update blockchain + create new PDF
- ✅ History shows in frontend (basic format)
- ✅ All three storage layers working together

This hybrid architecture provides the perfect balance of performance, immutability, and user experience for the LoadBlock platform.