# User Access Model Documentation

## Overview

The platform implements a multi-tenant user access model with role-based access control (RBAC). Users can be global (Super Admin) or belong to multiple tenants with different roles per tenant.

## Architecture

### User Model

**Global User (User table)**
- `id`: Unique identifier
- `email`: Unique email address
- `passwordHash`: Hashed password
- `firstName`, `lastName`: User name fields
- `isSuperAdmin`: Boolean flag for super admin status
- `status`: ACTIVE | SUSPENDED | INACTIVE

**Super Admin (`isSuperAdmin=true`)**
- Can access all tenants
- Can perform all operations
- Bypasses all permission checks
- Can specify tenant scope via `x-tenant-id` header in admin portal

### Tenant Membership

**TenantUser (Membership table)**
- `id`: Unique identifier
- `tenantId`: Reference to Tenant
- `userId`: Reference to User
- `status`: ACTIVE | SUSPENDED | INACTIVE
- Links a user to a tenant (many-to-many relationship)

**Key Points:**
- A user can belong to multiple tenants
- Same user can have different roles in different tenants
- Membership status controls access to tenant resources

### Role-Based Access Control (RBAC)

**Role (Per Tenant)**
- `id`: Unique identifier
- `tenantId`: Reference to Tenant
- `name`: Display name (e.g., "Admin", "Manager")
- `slug`: Unique identifier within tenant (e.g., "admin", "manager")
- `isSystem`: Boolean flag for system roles (cannot be deleted)

**Permission (Global)**
- `id`: Unique identifier
- `resource`: Resource name (e.g., "customer", "deal", "segment")
- `action`: Action name (e.g., "read", "write", "delete")
- Format: `{resource}:{action}` (e.g., "customer:read", "deal:write")

**RolePermission (Role → Permissions)**
- Links roles to permissions
- Defines what actions a role can perform on resources

**TenantUserRole (User → Role in Tenant)**
- Links users to roles within a tenant
- A user can have multiple roles in the same tenant
- Permissions are aggregated from all roles

## Authentication & Authorization

### JWT Token Structure

**For Tenant Portal:**
```json
{
  "sub": "user-id",
  "tenantId": "tenant-id",
  "roles": ["admin", "manager"],
  "permissions": ["customer:read", "deal:write", ...]
}
```

**For Admin Portal:**
```json
{
  "sub": "user-id",
  "isSuperAdmin": true
}
```

### Guards

1. **JwtAuthGuard**
   - Validates JWT token
   - Extracts user information
   - Loads permissions for tenant users

2. **TenantGuard**
   - Ensures user has access to the requested tenant
   - Super admin bypasses tenant checks
   - Regular users can only access tenants they belong to

3. **RbacGuard**
   - Checks if user has required permissions
   - Super admin bypasses all permission checks
   - Validates `@RequirePermissions()` decorator

### Interceptors

**TenantContextInterceptor**
- Extracts tenant context from request
- For super admin: allows `x-tenant-id` header, query param, or body param
- For regular users: enforces tenant from JWT token
- Sets `request.tenantId` for downstream handlers

## API Endpoints

### Admin Endpoints (`/admin/*`)

#### `GET /admin/me`
Returns current admin user info with memberships.

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isSuperAdmin": true,
  "status": "ACTIVE",
  "memberships": [
    {
      "tenantId": "tenant-id",
      "tenantName": "Acme Corp",
      "tenantSlug": "acme-corp",
      "tenantType": "B2B",
      "tenantStatus": "ACTIVE",
      "roles": [
        {
          "id": "role-id",
          "name": "Admin",
          "slug": "admin"
        }
      ],
      "status": "ACTIVE"
    }
  ],
  "allowedTenants": ["tenant-id-1", "tenant-id-2"]
}
```

#### `GET /admin/tenants`
Returns tenants accessible to current user.

- **Super Admin**: Returns all tenants
- **Regular User**: Returns only tenants they belong to

**Response:**
```json
[
  {
    "id": "tenant-id",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "type": "B2B",
    "status": "ACTIVE",
    "plan": "enterprise",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### `GET /admin/tenants/:tenantId/users`
Returns users in a specific tenant.

**Access Control:**
- Super admin can access any tenant
- Regular users can only access tenants they belong to

**Response:**
```json
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "ACTIVE",
    "isSuperAdmin": false,
    "tenantMembership": {
      "id": "membership-id",
      "status": "ACTIVE",
      "roles": [
        {
          "id": "role-id",
          "name": "Admin",
          "slug": "admin"
        }
      ]
    }
  }
]
```

## Frontend Admin Portal

### Tenant Switcher

**Location:** Top header (visible only for Super Admin)

**Features:**
- Dropdown list of accessible tenants
- "All Tenants" option for super admin view
- Persists selection in localStorage
- Sends `x-tenant-id` header with API requests

**Usage:**
```typescript
const { activeTenant, setActiveTenant, accessibleTenants } = useTenant();
```

### Menu Gating

Menu items are filtered based on:
- `requiresSuperAdmin`: Only visible to super admin users
- `requiresTenant`: Only visible when a tenant is selected
- Role-based permissions (future enhancement)

### Tenant Context

**TenantProvider** wraps the admin app and provides:
- `activeTenant`: Currently selected tenant (or null)
- `setActiveTenant`: Function to change active tenant
- `accessibleTenants`: List of tenants user can access
- Persists selection in localStorage

## Usage Examples

### Backend: Restricting Access to Tenant

```typescript
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
export class CustomerController {
  @Get()
  @RequirePermissions('customer:read')
  findAll(@TenantId() tenantId: string) {
    // Only returns customers for the tenant
    // Super admin can specify tenant via x-tenant-id header
    return this.customerService.findAll(tenantId);
  }
}
```

### Frontend: Using Tenant Context

```typescript
function MyComponent() {
  const { activeTenant } = useTenant();
  const { data } = useQuery(
    'customers',
    () => api.get('/customers'),
    { enabled: !!activeTenant }
  );
  
  if (!activeTenant) {
    return <div>Please select a tenant</div>;
  }
  
  return <div>Customers for {activeTenant.name}</div>;
}
```

## Security Considerations

1. **Always validate tenant access** - Use TenantGuard on protected routes
2. **Check permissions** - Use RbacGuard with @RequirePermissions()
3. **Super admin bypass** - Handled automatically by guards
4. **Tenant isolation** - All queries should filter by tenantId
5. **Header injection** - Only `x-tenant-id` header is accepted from authenticated super admin users

## Future Enhancements

- Tenant-specific feature flags
- Dynamic role assignment UI
- Permission matrix visualization
- Audit logging for tenant access
- Tenant-level API rate limiting
