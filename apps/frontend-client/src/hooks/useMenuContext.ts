import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { featureFlagApi, tenantApi } from '../services/api';

export function useMenuContext() {
  const { user } = useAuth();
  const { activeTenant } = useTenant();

  // Use activeTenant from context if available, otherwise fall back to user.tenantId
  const tenantId = activeTenant?.id || user?.tenantId;

  // Fetch tenant info if user has tenantId
  const { data: tenant } = useQuery(
    ['tenant', tenantId],
    () => tenantApi.get(tenantId!),
    {
      enabled: !!tenantId && !user?.isSuperAdmin,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch feature flags
  const { data: featureFlags = {} } = useQuery(
    ['feature-flags', tenantId],
    async () => {
      if (!tenantId || user?.isSuperAdmin) return {};
      const flags = await featureFlagApi.list();
      return flags.reduce((acc: Record<string, boolean>, flag: any) => {
        acc[flag.key] = flag.enabled;
        return acc;
      }, {});
    },
    {
      enabled: !!tenantId && !user?.isSuperAdmin,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Extract permissions from user (should be in JWT payload or fetched separately)
  const permissions = user?.permissions || [];

  return {
    tenantType: tenant?.type,
    featureFlags,
    permissions,
    isSuperAdmin: user?.isSuperAdmin || false,
  };
}
