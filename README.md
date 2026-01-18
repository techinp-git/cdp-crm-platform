# YDM CDP & CRM Platform

A production-ready multi-tenant SaaS platform for Customer Data Platform (CDP) and Customer Relationship Management (CRM).

## 🏗️ Architecture

### Monorepo Structure
```
ydm-platform/
├── apps/
│   ├── frontend-admin/     # Super Admin Portal
│   ├── frontend-client/     # Tenant Portal
│   └── management-api/      # NestJS API
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── utils/               # Shared utilities
└── prisma/                  # Database schema & migrations
```

### Tech Stack
- **Monorepo**: Turborepo
- **Frontend**: React + TypeScript + TailwindCSS (Vite)
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT + Refresh Token + RBAC
- **API Docs**: Swagger (OpenAPI)

## 🚀 Getting Started

### Quick Start with Docker (Recommended)

**มี Docker Desktop อยู่แล้ว?** → ดู [QUICK_START.md](./QUICK_START.md)

```bash
# Development mode
make dev

# หรือ
docker-compose -f docker-compose.dev.yml up
```

### Prerequisites

**Option 1: Docker (Recommended)**
- Docker Desktop

**Option 2: Local Development**
- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cdp-crm-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp apps/management-api/.env.example apps/management-api/.env
   cp apps/frontend-client/.env.example apps/frontend-client/.env
   cp apps/frontend-admin/.env.example apps/frontend-admin/.env
   ```

4. **Configure database**
   - Update `apps/management-api/.env` with your PostgreSQL connection string
   - Example: `DATABASE_URL="postgresql://user:password@localhost:5432/ydm_platform?schema=public"`

5. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

6. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

7. **Seed the database**
   ```bash
   npm run db:seed
   ```

   This creates:
   - Super admin user: `admin@ydm-platform.com` / `SuperAdmin123!`
   - Sample tenant: `acme-corp`
   - Tenant admin: `admin@acme-corp.com` / `Admin123!`
   - Sample customers, leads, deals, etc.

### Running the Applications

#### Option 1: Using Docker (Recommended)

**Development mode:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Production mode:**
```bash
docker-compose up -d
```

See [DOCKER.md](./DOCKER.md) for detailed Docker instructions.

#### Option 2: Local Development

**Development mode (all apps):**
```bash
npm run dev
```

This starts:
- Management API: http://localhost:3000
- Client Portal: http://localhost:3001
- Admin Portal: http://localhost:3002
- Swagger Docs: http://localhost:3000/api/docs

**Individual apps:**
```bash
# API only
cd apps/management-api && npm run dev

# Client portal only
cd apps/frontend-client && npm run dev

# Admin portal only
cd apps/frontend-admin && npm run dev
```

## 📋 Features

### Multi-Tenancy
- Every business table includes `tenant_id`
- Tenant isolation enforced at service + query level
- Super admin can access all tenants
- Tenant users are scoped to their tenant

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC)
- Permission-based access control
- Super admin bypass for system management

### CDP (Customer Data Platform)
- Customer profiles with flexible JSON schema
- Customer events tracking
- Segmentation (static & dynamic)
- Tags and customer tagging
- Customer 360° view

### CRM (Customer Relationship Management)
- Leads management
- Deals pipeline (kanban view)
- Deal stages with probability tracking
- Activities & Tasks
- Accounts & Contacts (B2B)
- Activity tracking

### Admin Features
- Tenant management
- User management
- Role & Permission management
- Feature flags per tenant
- Audit logs
- Analytics & KPIs

## 🔐 Default Credentials

After seeding:

**Super Admin:**
- Email: `admin@ydm-platform.com`
- Password: `SuperAdmin123!`

**Tenant Admin:**
- Email: `admin@acme-corp.com`
- Password: `Admin123!`

## 📚 API Documentation

Swagger/OpenAPI documentation is available at:
- http://localhost:3000/api/docs

## 🗄️ Database

### Prisma Commands
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Key Models
- **Tenant**: Multi-tenant isolation
- **User**: Global user identity
- **TenantUser**: User-tenant relationship
- **Role & Permission**: RBAC system
- **Customer**: CDP customer profiles
- **Deal**: CRM deals pipeline
- **Lead**: CRM leads
- **FeatureFlag**: Per-tenant feature flags
- **AuditLog**: Activity tracking

## 🎨 Design System

### Colors
- Primary: `#FFFF00` (Yellow)
- Base: `#000000` (Black)
- Background: `#F5F5F5` (Light Gray)
- Success: `#2ECC71` (Green)
- Warning: `#F39C12` (Orange)
- Error: `#E74C3C` (Red)
- Info: `#3498DB` (Blue)

## 🔧 Development

### Project Scripts
```bash
# Development
npm run dev              # Start all apps in dev mode

# Building
npm run build            # Build all apps

# Linting
npm run lint             # Lint all apps

# Type checking
npm run type-check       # Type check all apps

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio
```

### Code Structure

**API (NestJS):**
- `src/common/` - Shared guards, decorators, interceptors
- `src/auth/` - Authentication module
- `src/tenant/` - Tenant management
- `src/user/` - User management
- `src/role/` - RBAC
- `src/cdp/` - CDP modules (Customer, Segment, Tag)
- `src/crm/` - CRM modules (Lead, Deal, Activity, Account, Contact)
- `src/feature-flag/` - Feature flags
- `src/audit-log/` - Audit logging
- `src/analytics/` - Analytics & KPIs

**Frontend:**
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/services/` - API services
- `src/contexts/` - React contexts
- `src/config/` - Configuration (menu, etc.)

## 🏗️ Architecture Decisions

### Tenant Isolation Strategy
1. **Database Level**: All business tables include `tenant_id` column
2. **Service Level**: Services enforce tenant filtering
3. **Interceptor Level**: `TenantContextInterceptor` automatically injects tenant context
4. **Query Level**: Prisma queries always filter by `tenant_id`

### Security
- JWT tokens include `tenantId` for tenant users
- Super admin tokens don't include `tenantId` (can access all)
- RBAC guards check permissions before route access
- Tenant context interceptor validates tenant access

### Feature Flags
- Per-tenant feature flags
- Can be checked in API and UI
- Menu items can be hidden based on feature flags

### Audit Logging
- All sensitive actions are logged
- Includes actor, entity, action, and payload
- Supports filtering by tenant, entity, action

## 🚧 Next Steps / Phase 2

- [ ] Advanced segmentation with query builder
- [ ] RFM analysis
- [ ] CLV (Customer Lifetime Value) calculations
- [ ] Cohort analysis
- [ ] Marketing automation workflows
- [ ] Email templates
- [ ] Billing integration (Stripe/Paddle)
- [ ] Usage & quota enforcement
- [ ] Advanced analytics & reporting
- [ ] Webhooks
- [ ] API rate limiting
- [ ] Queue system (BullMQ) for async tasks

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]
# cdp-crm-platform
