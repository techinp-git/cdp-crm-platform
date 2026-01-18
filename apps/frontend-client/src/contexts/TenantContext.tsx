import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from './AuthContext';
import { tenantApi } from '../services/api';
import api from '../services/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
}

interface TenantContextType {
  activeTenant: Tenant | null;
  setActiveTenant: (tenant: Tenant | null) => void;
  accessibleTenants: Tenant[];
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);

  // Get accessible tenants (for users with multiple tenant access)
  const { data: accessibleTenants = [], isLoading } = useQuery(
    'accessible-tenants',
    async () => {
      if (!user) return [];

      // Try to fetch user's tenant memberships from admin/me endpoint
      try {
        const response = await api.get('/admin/me');
        if (response.data?.memberships && response.data.memberships.length > 0) {
          // Convert memberships to Tenant objects (we have all data in memberships)
          const tenants: Tenant[] = response.data.memberships.map((m: any) => ({
            id: m.tenantId,
            name: m.tenantName || '',
            slug: m.tenantSlug || '',
            type: m.tenantType || '',
            status: m.tenantStatus || 'ACTIVE',
          }));
          return tenants;
        }
      } catch (error) {
        // If admin/me fails, fall back to single tenant from JWT
        console.debug('Admin endpoint not available, using JWT tenantId', error);
      }

      // Fallback: if user has tenantId in JWT, fetch current tenant info
      if (user.tenantId) {
        try {
          // `/tenants/:id` requires `tenant:read` (super-admin style).
          // For tenant users we use `/tenants/me` which derives tenant from JWT / tenant context.
          const tenant = await tenantApi.me();
          return [tenant];
        } catch (error) {
          console.error('Failed to fetch tenant:', error);
          return [];
        }
      }

      return [];
    },
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Load active tenant from localStorage on mount and when accessibleTenants change
  useEffect(() => {
    if (accessibleTenants.length === 0) return;

    // Check localStorage first
    const stored = localStorage.getItem('activeTenant');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Verify the stored tenant is still in accessible tenants
        const isValid = accessibleTenants.some(t => t.id === parsed.id);
        if (isValid) {
          // Only update if different
          setActiveTenantState((current) => {
            if (current?.id !== parsed.id) {
              return parsed;
            }
            return current;
          });
          return;
        }
      } catch (e) {
        // Invalid stored data, ignore
        console.debug('Failed to parse stored tenant', e);
      }
    }

    // Auto-select tenant if not already set
    setActiveTenantState((current) => {
      if (current) return current; // Don't override if already set
      
      // Try to match user.tenantId first
      let selectedTenant = accessibleTenants.find(t => t.id === user?.tenantId);
      // If no match, use first tenant
      if (!selectedTenant && accessibleTenants.length > 0) {
        selectedTenant = accessibleTenants[0];
      }
      
      if (selectedTenant) {
        localStorage.setItem('activeTenant', JSON.stringify(selectedTenant));
        localStorage.setItem('activeTenantId', selectedTenant.id);
        return selectedTenant;
      }
      
      return current;
    });
  }, [accessibleTenants, user?.tenantId]);

  // Update active tenant
  const setActiveTenant = (tenant: Tenant | null) => {
    setActiveTenantState(tenant);
    if (tenant) {
      localStorage.setItem('activeTenant', JSON.stringify(tenant));
      localStorage.setItem('activeTenantId', tenant.id);
    } else {
      localStorage.removeItem('activeTenant');
      localStorage.removeItem('activeTenantId');
    }
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        setActiveTenant,
        accessibleTenants,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
