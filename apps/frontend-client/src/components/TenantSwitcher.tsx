import { useState } from 'react';
import { useQueryClient } from 'react-query';
import { useTenant } from '../contexts/TenantContext';
import { useNavigate } from 'react-router-dom';

export function TenantSwitcher() {
  const { activeTenant, setActiveTenant, accessibleTenants } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (accessibleTenants.length <= 1) {
    return null; // Don't show switcher if user has only one tenant
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
      >
        <span>{activeTenant?.name || 'Select Tenant'}</span>
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
          <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-20">
            <div className="py-1">
              {accessibleTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    setActiveTenant(tenant);
                    setIsOpen(false);
                    // Invalidate all queries to reload data with new tenant context
                    queryClient.invalidateQueries();
                    // Optionally redirect to dashboard
                    navigate('/dashboard', { replace: true });
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    activeTenant?.id === tenant.id
                      ? 'bg-primary text-base font-medium'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{tenant.type}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
