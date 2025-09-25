#!/bin/bash

# LoadBlock Development Environment Setup Script
# This script sets up the complete development environment

echo "🚀 Setting up LoadBlock Development Environment..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        echo "⚠️  Node.js is not installed. Installing Node.js is recommended for development."
    fi

    echo "✅ Prerequisites check completed"
}

# Setup environment file
setup_environment() {
    echo "⚙️  Setting up environment configuration..."

    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ Environment file created (.env)"
        echo "📝 Please edit .env file with your configuration values"
    else
        echo "✅ Environment file already exists"
    fi
}

# Create necessary directories
setup_directories() {
    echo "📁 Creating necessary directories..."

    mkdir -p backend/temp
    mkdir -p logs
    mkdir -p blockchain/network/crypto-config
    mkdir -p ipfs/data

    echo "✅ Directories created"
}

# Install dependencies (if Node.js is available)
install_dependencies() {
    if command -v node &> /dev/null; then
        echo "📦 Installing dependencies..."

        if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
            cd frontend
            npm install
            cd ..
            echo "✅ Frontend dependencies installed"
        fi

        if [ -d "backend" ] && [ -f "backend/package.json" ]; then
            cd backend
            npm install
            cd ..
            echo "✅ Backend dependencies installed"
        fi
    else
        echo "ℹ️  Skipping dependency installation (Node.js not found)"
    fi
}

# Start services
start_services() {
    echo "🐳 Starting Docker services..."

    docker-compose up -d postgres redis ipfs

    echo "⏳ Waiting for services to be ready..."
    sleep 10

    echo "✅ Services started successfully"
}

# Run setup functions
main() {
    check_prerequisites
    setup_environment
    setup_directories
    install_dependencies
    start_services

    echo ""
    echo "🎉 LoadBlock development environment setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Start the full application: docker-compose up"
    echo "3. Access frontend: http://localhost:3000"
    echo "4. Access backend API: http://localhost:3001"
    echo "5. Default login: admin@loadblock.io / 12345678"
    echo ""
    echo "📚 See README.md for more information"
}

main