#!/bin/bash

# YDM CDP & CRM Platform - Docker Quick Start Script

set -e

echo "🚀 Starting YDM CDP & CRM Platform with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Ask user which mode to run
echo "Select mode:"
echo "1) Development (Hot Reload)"
echo "2) Production"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo "📦 Starting in Development mode..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    2)
        echo ""
        echo "📦 Starting in Production mode..."
        
        # Check if database is initialized
        if ! docker-compose exec -T postgres psql -U postgres -d ydm_platform -c "SELECT 1" > /dev/null 2>&1; then
            echo "🔧 Initializing database..."
            docker-compose up -d postgres
            echo "⏳ Waiting for PostgreSQL to be ready..."
            sleep 5
            
            echo "📊 Generating Prisma client..."
            docker-compose exec api sh -c "cd prisma && npm install && npx prisma generate" || true
            
            echo "🗄️ Running migrations..."
            docker-compose exec api npx prisma migrate deploy || true
            
            echo "🌱 Seeding database..."
            docker-compose exec api npm run db:seed || true
        fi
        
        docker-compose up -d --build
        echo ""
        echo "✅ Services started!"
        echo ""
        echo "📍 URLs:"
        echo "   API: http://localhost:3000"
        echo "   Client Portal: http://localhost:3001"
        echo "   Admin Portal: http://localhost:3002"
        echo "   Swagger: http://localhost:3000/api/docs"
        echo ""
        echo "📋 View logs: docker-compose logs -f"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
