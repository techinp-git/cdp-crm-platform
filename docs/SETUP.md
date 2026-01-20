# Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE ydm_platform;
```

### 3. Environment Variables

Create `.env` files in each app directory:

**apps/management-api/.env**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ydm_platform?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1h"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3001,http://localhost:3002"
```

**apps/frontend-client/.env**
```env
VITE_API_URL=http://localhost:3000
```

**apps/frontend-admin/.env**
```env
VITE_API_URL=http://localhost:3000
```

### 4. Database Migration & Seeding

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3000
- **Client Portal**: http://localhost:3001
- **Admin Portal**: http://localhost:3002
- **Swagger Docs**: http://localhost:3000/api/docs

## Default Login Credentials

After seeding:

**Super Admin:**
- URL: http://localhost:3002/login
- Email: `admin@ydm-platform.com`
- Password: `SuperAdmin123!`

**Tenant Admin:**
- URL: http://localhost:3001/login
- Email: `admin@acme-corp.com`
- Password: `Admin123!`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env` file
- Verify database exists

### Port Already in Use
- Change PORT in `.env` files
- Or kill process using the port

### Prisma Client Not Generated
```bash
cd prisma
npm install
npm run db:generate
```

### TypeScript Errors
```bash
npm run type-check
```

## Next Steps

1. Explore the Swagger docs at http://localhost:3000/api/docs
2. Login to admin portal and manage tenants
3. Login to client portal and explore CDP/CRM features
4. Review ARCHITECTURE.md for system design details
