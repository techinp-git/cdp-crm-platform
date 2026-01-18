import { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';

export function TenantSwitcher() {
  const { activeTenant, setActiveTenant, accessibleTenants, isLoading } = useTenant();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <div className="text-sm text-secondary-text">Loading tenants...</div>;
  }

  const handleSelectTenant = (tenant: typeof accessibleTenants[0] | null) => {
    setActiveTenant(tenant);
    setIsOpen(false);
    // Reload page to refresh data with new tenant context
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-background"
      >
        <span className="font-medium">
          {activeTenant ? activeTenant.name : 'No Tenant Selected'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => handleSelectTenant(null)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-background ${
                  !activeTenant ? 'bg-primary/10 text-primary font-medium' : ''
                }`}
              >
                <div className="font-medium">All Tenants (Super Admin View)</div>
                <div className="text-xs text-secondary-text">View all tenants</div>
              </button>
            </div>
            <div className="border-t border-border" />
            {accessibleTenants.length === 0 ? (
              <div className="p-4 text-center text-sm text-secondary-text">
                No tenants available
              </div>
            ) : (
              <div className="p-2">
                {accessibleTenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleSelectTenant(tenant)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-background mb-1 ${
                      activeTenant?.id === tenant.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : ''
                    }`}
                  >
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-xs text-secondary-text">
                      {tenant.type} • {tenant.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
