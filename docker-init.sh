#!/bin/bash

# Database initialization script for Docker

set -e

echo "🔧 Initializing database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done

echo "✅ PostgreSQL is ready"
echo ""

# Generate Prisma client
echo "📊 Generating Prisma client..."
docker-compose exec api sh -c "cd prisma && npm install && npx prisma generate" || \
docker-compose -f docker-compose.dev.yml exec api sh -c "cd prisma && npm install && npx prisma generate"

echo ""

# Run migrations
echo "🗄️ Running migrations..."
docker-compose exec api npx prisma migrate deploy || \
docker-compose -f docker-compose.dev.yml exec api npx prisma migrate dev --name init

echo ""

# Seed database
echo "🌱 Seeding database..."
docker-compose exec api npm run db:seed || \
docker-compose -f docker-compose.dev.yml exec api npm run db:seed

echo ""
echo "✅ Database initialized successfully!"
echo ""
echo "📋 Default credentials:"
echo "   Super Admin: admin@ydm-platform.com / SuperAdmin123!"
echo "   Tenant Admin: admin@acme-corp.com / Admin123!"
