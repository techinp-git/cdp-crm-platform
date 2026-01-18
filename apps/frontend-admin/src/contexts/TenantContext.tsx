import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from 'react-query';
import { adminApi } from '../services/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  plan?: string;
}

interface TenantContextType {
  activeTenant: Tenant | null;
  setActiveTenant: (tenant: Tenant | null) => void;
  accessibleTenants: Tenant[];
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);
  const { data: tenants, isLoading } = useQuery('accessible-tenants', adminApi.getAccessibleTenants);

  // Load active tenant from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeTenant');
    if (stored) {
      try {
        setActiveTenantState(JSON.parse(stored));
      } catch (e) {
        // Invalid stored data, ignore
      }
    }
  }, []);

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
        accessibleTenants: tenants || [],
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
