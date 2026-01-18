# Architecture Summary

## Multi-Tenant SaaS Platform Architecture

### Core Principles

1. **Tenant Isolation**
   - Every business table includes `tenant_id`
   - Tenant context enforced at multiple layers:
     - Database: Prisma queries filter by `tenant_id`
     - Service: Services validate tenant ownership
     - Interceptor: `TenantContextInterceptor` injects tenant context
     - Guards: RBAC guards check permissions per tenant

2. **Authentication Flow**
   - JWT tokens include `tenantId` for tenant users
   - Super admin tokens exclude `tenantId` (can access all tenants)
   - Refresh tokens for seamless re-authentication
   - Token refresh handled automatically in frontend

3. **Authorization (RBAC)**
   - Roles are tenant-scoped
   - Permissions are global (resource:action format)
   - Role-Permission mapping per tenant
   - User-Role assignment per tenant
   - Super admin bypasses all permission checks

4. **Feature Flags**
   - Per-tenant feature flags
   - Can gate API endpoints and UI components
   - Menu items filtered by feature flags

## Data Flow

### Request Flow
1. Client sends request with JWT token
2. `JwtAuthGuard` validates token
3. `JwtStrategy` loads user and permissions
4. `TenantContextInterceptor` extracts/injects tenant context
5. `RbacGuard` checks permissions
6. Service layer enforces tenant isolation
7. Prisma queries filter by `tenant_id`

### Tenant Resolution
- **Tenant Users**: `tenantId` from JWT payload
- **Super Admin**: Can specify `tenantId` in query/body, or access all

## Database Schema

### Key Relationships
- `User` (1) -> (N) `TenantUser` -> (N) `Tenant`
- `Tenant` (1) -> (N) `Role`
- `Role` (N) -> (N) `Permission` (via `RolePermission`)
- `TenantUser` (N) -> (N) `Role` (via `TenantUserRole`)

### Tenant Isolation
All business tables include:
- `tenant_id` (required, indexed)
- Foreign key to `Tenant` with `onDelete: Cascade`

## API Structure

### Module Organization
- **Auth**: Login, refresh token
- **Tenant**: CRUD (super admin only)
- **User**: User management, tenant assignment
- **Role**: RBAC management
- **CDP**: Customer, Segment, Tag, Event
- **CRM**: Lead, Deal, DealStage, Activity, Account, Contact
- **FeatureFlag**: Per-tenant feature toggles
- **AuditLog**: Activity tracking
- **Analytics**: KPIs and aggregations

### Common Patterns
- All controllers use `@UseGuards(JwtAuthGuard, RbacGuard)`
- All controllers use `@UseInterceptors(TenantContextInterceptor)`
- Services receive `tenantId` as first parameter
- Prisma queries always filter by `tenantId`

## Frontend Architecture

### Client Portal
- Tenant-scoped views
- Menu filtered by permissions and feature flags
- Customer 360° view
- Deal kanban board
- Dashboard with KPIs

### Admin Portal
- Super admin only
- Tenant management
- User management
- System settings

### Shared Packages
- `@ydm-platform/types`: TypeScript types
- `@ydm-platform/utils`: Menu filtering, permission helpers

## Security Considerations

1. **Tenant Isolation**: Enforced at multiple layers
2. **RBAC**: Permission-based access control
3. **JWT**: Secure token-based auth
4. **Audit Logs**: Track sensitive actions
5. **Input Validation**: Class-validator DTOs
6. **SQL Injection**: Prisma ORM prevents SQL injection

## Scalability Considerations

1. **Database Indexing**: All `tenant_id` columns indexed
2. **Query Optimization**: Tenant filtering at database level
3. **Caching**: Can add Redis for feature flags, permissions
4. **Queue System**: Placeholder for BullMQ (async tasks)
5. **Horizontal Scaling**: Stateless API, can scale horizontally

## Extension Points

1. **Billing**: Integrate Stripe/Paddle
2. **Marketing Automation**: Workflow engine
3. **Advanced Analytics**: RFM, CLV, Cohort analysis
4. **Webhooks**: Event-driven integrations
5. **API Rate Limiting**: Per-tenant rate limits
6. **Multi-region**: Database replication, CDN
