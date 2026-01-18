import { MenuItem, MenuConfig } from '@ydm-platform/types';

export interface MenuFilterContext {
  tenantType?: string;
  featureFlags?: Record<string, boolean>;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export function filterMenuItems(
  items: MenuItem[],
  context: MenuFilterContext
): MenuItem[] {
  return items
    .filter((item) => {
      // Super admin only check
      if (item.isSuperAdminOnly && !context.isSuperAdmin) {
        return false;
      }

      // Tenant type check
      if (
        item.requiresTenantType &&
        (!context.tenantType || !item.requiresTenantType.includes(context.tenantType))
      ) {
        return false;
      }

      // Feature flag check
      if (
        item.requiresFeatureFlag &&
        (!context.featureFlags || !context.featureFlags[item.requiresFeatureFlag])
      ) {
        return false;
      }

      // Permission check
      if (item.requiresPermission) {
        if (context.isSuperAdmin) {
          return true; // Super admins bypass permission checks
        }
        if (!context.permissions || !context.permissions.includes(item.requiresPermission)) {
          return false;
        }
      }

      return true;
    })
    .map((item) => {
      // Recursively filter children
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterMenuItems(item.children, context),
        };
      }
      return item;
    })
    .filter((item) => {
      // Remove parent items with no visible children
      if (item.children && item.children.length === 0) {
        return false;
      }
      return true;
    });
}

export function filterMenu(config: MenuConfig, context: MenuFilterContext): MenuConfig {
  return {
    items: filterMenuItems(config.items, context),
  };
}
