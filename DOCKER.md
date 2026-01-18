# Docker Setup Guide

## 🐳 Quick Start

### Development Mode (Hot Reload)

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production Mode

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v
```

## 📋 Services

After starting, services will be available at:

- **PostgreSQL**: `localhost:5432`
- **API**: http://localhost:3000
- **Client Portal**: http://localhost:3001
- **Admin Portal**: http://localhost:3002
- **Swagger Docs**: http://localhost:3000/api/docs

## 🗄️ Database Commands

### Initial Setup (First Time)

```bash
# Generate Prisma client
docker-compose exec api sh -c "cd prisma && npm install && npx prisma generate"

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Seed database
docker-compose exec api npm run db:seed
```

### Development Mode

```bash
# Generate Prisma client
docker-compose -f docker-compose.dev.yml exec api sh -c "cd prisma && npx prisma generate"

# Run migrations
docker-compose -f docker-compose.dev.yml exec api npx prisma migrate dev

# Seed database
docker-compose -f docker-compose.dev.yml exec api npm run db:seed

# Prisma Studio (Database GUI)
docker-compose -f docker-compose.dev.yml exec api npx prisma studio
```

## 🔧 Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend-client
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
```

### Rebuild Images

```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build api

# Rebuild without cache
docker-compose build --no-cache
```

### Execute Commands in Container

```bash
# API container
docker-compose exec api sh

# Run npm command
docker-compose exec api npm run type-check

# Database shell
docker-compose exec postgres psql -U postgres -d ydm_platform
```

## 🔐 Default Credentials

After seeding the database:

**Super Admin:**
- URL: http://localhost:3002/login
- Email: `admin@ydm-platform.com`
- Password: `SuperAdmin123!`

**Tenant Admin:**
- URL: http://localhost:3001/login
- Email: `admin@acme-corp.com`
- Password: `Admin123!`

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5432

# Kill the process or change port in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma client
docker-compose exec api sh -c "cd prisma && npx prisma generate"
```

### Clear Everything and Start Fresh

```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

### View Container Resources

```bash
# Container stats
docker stats

# Specific container
docker stats ydm-api
```

## 📦 Volume Management

### List Volumes

```bash
docker volume ls
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres ydm_platform > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres ydm_platform < backup.sql
```

## 🚀 Production Deployment

### Build for Production

```bash
# Build all images
docker-compose build

# Tag images for registry
docker tag ydm-api:latest your-registry/ydm-api:latest
docker tag ydm-client:latest your-registry/ydm-client:latest
docker tag ydm-admin:latest your-registry/ydm-admin:latest
```

### Environment Variables

For production, update environment variables in `docker-compose.yml`:

```yaml
environment:
  DATABASE_URL: "postgresql://user:password@postgres:5432/ydm_platform"
  JWT_SECRET: "your-production-secret-key"
  NODE_ENV: "production"
```

## 📝 Notes

- **Development mode** uses volume mounts for hot reload
- **Production mode** uses optimized multi-stage builds
- Database data persists in Docker volumes
- All services are on the same Docker network for communication
- Frontend apps use Nginx in production for better performance
