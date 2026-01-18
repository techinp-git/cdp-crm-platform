export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  // Visibility rules
  requiresTenantType?: string[]; // e.g., ['B2B', 'HYBRID']
  requiresFeatureFlag?: string; // Feature flag key
  requiresPermission?: string; // e.g., 'customer:read'
  isSuperAdminOnly?: boolean;
}

export interface MenuConfig {
  items: MenuItem[];
}
