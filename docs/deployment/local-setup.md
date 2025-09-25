# LoadBlock Local Development Setup

This guide walks you through setting up LoadBlock for local development.

## Prerequisites

- Docker Desktop (latest version)
- Docker Compose
- Node.js 18+ (recommended for development)
- Git

## Quick Setup

### 1. Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd loadblock

# Run the automated setup script
./scripts/setup-dev-environment.sh
```

This script will:
- Check prerequisites
- Create environment configuration
- Set up necessary directories
- Install dependencies (if Node.js is available)
- Start core services

### 2. Manual Setup

If you prefer manual setup or the script doesn't work:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit environment variables
# Update .env with your local configuration

# 3. Create necessary directories
mkdir -p backend/temp logs

# 4. Start services
docker-compose up -d
```

## Starting the Application

### Option 1: Using the Start Script
```bash
./scripts/start-local.sh
```

### Option 2: Manual Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Service URLs

Once running, access these URLs:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **IPFS Gateway**: http://localhost:8080
- **IPFS API**: http://localhost:5001

## Default Login

- **Email**: `admin@loadblock.io`
- **Password**: `12345678`

## Development Workflow

### Frontend Development
```bash
cd frontend
npm install
npm start              # Hot reload development
npm run build         # Production build
npm test              # Run tests
```

### Backend Development
```bash
cd backend
npm install
npm run dev           # Development with nodemon
npm run start         # Production mode
npm test              # Run tests
npm run lint          # Code linting
```

### Database Management
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U loadblock_user -d loadblock_dev

# View database logs
docker-compose logs postgres
```

### IPFS Management
```bash
# Check IPFS status
curl http://localhost:5001/api/v0/id

# View IPFS logs
docker-compose logs ipfs

# Browse IPFS gateway
open http://localhost:8080/ipfs/QmHash...
```

## Common Issues

### Port Conflicts
If ports 3000, 3001, 5001, or 8080 are in use:
1. Edit `docker-compose.yml` to change port mappings
2. Update `.env` file with new port numbers
3. Restart services

### Docker Permission Issues (Linux/Mac)
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

### Database Connection Issues
```bash
# Reset database
docker-compose down
docker volume rm loadblock_postgres_data
docker-compose up -d postgres
```

### IPFS Node Issues
```bash
# Reset IPFS data
docker-compose down
docker volume rm loadblock_ipfs_data
docker-compose up -d ipfs
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

## Directory Structure

```
loadblock/
├── frontend/          # React application
├── backend/           # Node.js API
├── blockchain/        # Fabric configurations
├── ipfs/             # IPFS setup
├── scripts/          # Development scripts
├── docs/             # Documentation
└── docker-compose.yml # Local orchestration
```

## Next Steps

After successful setup:

1. **Explore the UI**: Visit http://localhost:3000 and login
2. **Test BoL Creation**: Create a sample Bill of Lading
3. **Check Blockchain**: Verify transactions are recorded
4. **Review Documentation**: Check `/docs` for detailed guides
5. **Development**: Start building new features

## Getting Help

- Check `docker-compose logs` for service errors
- Review individual service logs: `docker-compose logs [service-name]`
- Ensure all prerequisites are installed
- Verify port availability
- Check `.env` configuration