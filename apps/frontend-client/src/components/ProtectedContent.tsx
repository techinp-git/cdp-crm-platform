import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { hasPermission } from '@ydm-platform/utils';

interface ProtectedContentProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredFeatureFlag?: string;
  requiredTenantType?: string[];
  fallback?: ReactNode;
}

export function ProtectedContent({
  children,
  requiredPermission,
  requiredFeatureFlag,
  requiredTenantType,
  fallback,
}: ProtectedContentProps) {
  const { user } = useAuth();

  // Super admin bypass
  if (user?.isSuperAdmin) {
    return <>{children}</>;
  }

  // Permission check
  if (requiredPermission) {
    const userPermissions = user?.permissions || [];
    if (!hasPermission(userPermissions, requiredPermission)) {
      return (
        fallback || (
          <EmptyState
            title="Permission Denied"
            message={`You need the "${requiredPermission}" permission to access this content.`}
          />
        )
      );
    }
  }

  // Feature flag check (would need to be loaded from context/API)
  // This is a placeholder - in real implementation, load from useMenuContext
  if (requiredFeatureFlag) {
    // For now, we'll assume feature flags are checked at menu level
    // This could be enhanced to check feature flags here too
  }

  // Tenant type check
  if (requiredTenantType && user?.tenantId) {
    // This would need tenant type from context
    // For now, assume it's checked at menu level
  }

  return <>{children}</>;
}
