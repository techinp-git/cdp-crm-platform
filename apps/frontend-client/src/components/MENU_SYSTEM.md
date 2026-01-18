# Sidebar Menu System Documentation

## Overview

The sidebar menu system is a React-based navigation component that dynamically filters menu items based on:
- **Tenant Type** (B2B, B2C, HYBRID)
- **Feature Flags** (per-tenant feature toggles)
- **RBAC Permissions** (role-based access control)

## Architecture

### Components

1. **Sidebar** (`src/components/Sidebar.tsx`)
   - Main navigation component
   - Handles menu filtering and rendering
   - Shows empty state when no items are visible

2. **MenuIcon** (`src/components/MenuIcon.tsx`)
   - Icon component for menu items
   - Supports: dashboard, users, briefcase, settings, chart

3. **EmptyState** (`src/components/EmptyState.tsx`)
   - Reusable empty state component
   - Used when permissions are denied

4. **ProtectedContent** (`src/components/ProtectedContent.tsx`)
   - Wrapper component for protecting page content
   - Checks permissions, feature flags, tenant type

### Configuration

**Menu Config** (`src/config/menu.ts`)
- Single source of truth for all menu items
- Defines menu structure, paths, icons
- Includes permission and feature flag requirements

### Hooks

**useMenuContext** (`src/hooks/useMenuContext.ts`)
- Fetches tenant information
- Loads feature flags from API
- Extracts user permissions
- Provides context for menu filtering

### Utilities

**Menu Filter** (`packages/utils/src/menu-filter.ts`)
- `filterMenu()` - Main filtering function
- `filterMenuItems()` - Recursive item filtering
- Filters by:
  - Super admin status
  - Tenant type
  - Feature flags
  - Permissions

## Usage

### Basic Menu Item

```typescript
{
  id: 'dashboard',
  label: 'Dashboard',
  path: '/dashboard',
  icon: 'dashboard',
}
```

### Menu Item with Permission

```typescript
{
  id: 'customers',
  label: 'Customers',
  path: '/cdp/customers',
  requiresPermission: 'customer:read',
}
```

### Menu Item with Feature Flag

```typescript
{
  id: 'cdp',
  label: 'CDP',
  icon: 'users',
  requiresFeatureFlag: 'cdp_enabled',
  children: [...]
}
```

### Menu Item with Tenant Type Restriction

```typescript
{
  id: 'accounts',
  label: 'Accounts',
  path: '/crm/accounts',
  requiresPermission: 'account:read',
  requiresTenantType: ['B2B', 'HYBRID'],
}
```

### Nested Menu Items

```typescript
{
  id: 'crm',
  label: 'CRM',
  icon: 'briefcase',
  children: [
    { id: 'leads', label: 'Leads', path: '/crm/leads' },
    { id: 'deals', label: 'Deals', path: '/crm/deals' },
  ]
}
```

## Protecting Page Content

Use `ProtectedContent` component to protect page content:

```tsx
import { ProtectedContent } from '../components/ProtectedContent';

export function CustomerList() {
  return (
    <ProtectedContent requiredPermission="customer:read">
      <div>Customer list content...</div>
    </ProtectedContent>
  );
}
```

## Filtering Logic

1. **Super Admin**: Bypasses all permission checks
2. **Tenant Type**: Menu items are filtered if tenant type doesn't match
3. **Feature Flags**: Menu items are hidden if feature flag is disabled
4. **Permissions**: Menu items are hidden if user lacks required permission
5. **Parent Items**: Automatically hidden if all children are filtered out

## Empty States

The sidebar automatically shows an empty state when:
- No menu items are visible after filtering
- User lacks permissions for all menu items

The empty state includes:
- Lock icon
- "No Access" message
- Instructions to contact administrator

## Styling

The sidebar uses Tailwind CSS with the following design:
- **Background**: `bg-base` (black)
- **Active Item**: `bg-primary` (yellow) with `text-base` (black)
- **Hover**: `hover:bg-gray-800`
- **Icons**: SVG icons with proper sizing
- **Typography**: Clear hierarchy with proper font weights

## API Integration

The menu system integrates with:
- `/tenants/:id` - Fetch tenant information (for tenant type)
- `/feature-flags` - Fetch feature flags
- JWT token - Extract user permissions

## Best Practices

1. **Single Config File**: Keep all menu definitions in `menu.ts`
2. **Permission Naming**: Use `resource:action` format (e.g., `customer:read`)
3. **Feature Flags**: Use descriptive keys (e.g., `cdp_enabled`, `crm_enabled`)
4. **Empty States**: Always provide helpful messages
5. **Icons**: Use consistent icon names from MenuIcon component

## Extending the Menu

To add a new menu item:

1. Add to `menuConfig` in `src/config/menu.ts`
2. Add icon to `MenuIcon` component if needed
3. Create corresponding route in `App.tsx`
4. Create page component
5. Optionally protect with `ProtectedContent`

Example:

```typescript
// In menu.ts
{
  id: 'new-feature',
  label: 'New Feature',
  path: '/new-feature',
  icon: 'chart',
  requiresPermission: 'new_feature:read',
  requiresFeatureFlag: 'new_feature_enabled',
}
```
