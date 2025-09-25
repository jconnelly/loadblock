#!/bin/bash

# LoadBlock Local Development Startup Script
# This script starts the complete LoadBlock application stack locally

echo "🚀 Starting LoadBlock Local Development Stack..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup-dev-environment.sh first"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start all services
echo "🐳 Starting all LoadBlock services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 15

# Check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "🔍 Checking $service_name health..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi

        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ $service_name failed to start properly"
    return 1
}

# Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U loadblock_user -d loadblock_dev > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Redis
echo "🔍 Checking Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check IPFS
check_service_health "IPFS" "5001"

# Check Backend (if running)
if docker-compose ps backend | grep -q "Up"; then
    check_service_health "Backend API" "3001"
fi

# Check Frontend (if running)
if docker-compose ps frontend | grep -q "Up"; then
    check_service_health "Frontend" "3000"
fi

echo ""
echo "🎉 LoadBlock services are running!"
echo ""
echo "📋 Service URLs:"
echo "• Frontend: http://localhost:3000"
echo "• Backend API: http://localhost:3001"
echo "• IPFS Gateway: http://localhost:8080"
echo "• IPFS API: http://localhost:5001"
echo ""
echo "📊 View logs:"
echo "• All services: docker-compose logs -f"
echo "• Backend only: docker-compose logs -f backend"
echo "• Frontend only: docker-compose logs -f frontend"
echo ""
echo "🔐 Default login:"
echo "• Email: admin@loadblock.io"
echo "• Password: 12345678"
echo ""
echo "🛑 To stop services: docker-compose down"