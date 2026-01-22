import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { filterMenu } from '@ydm-platform/utils';
import { menuConfig } from '../config/menu';
import { useMenuContext } from '../hooks/useMenuContext';
import { MenuIcon } from './MenuIcon';
import { TenantSwitcher } from './TenantSwitcher';
import { useQuery } from 'react-query';
import api from '../services/api';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

type TenantMe = {
  id: string;
  name: string;
  slug: string;
  type?: string;
  metadata?: any;
};

function getInitials(name?: string) {
  const s = String(name || '').trim();
  if (!s) return 'Y';
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[1]?.[0] || '' : parts[0]?.[1] || '';
  return (a + b).toUpperCase() || 'Y';
}

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { activeTenant, accessibleTenants, isLoading: tenantLoading } = useTenant();
  const menuContext = useMenuContext();

  const filteredMenu = filterMenu(menuConfig, menuContext);

  const storageKey = 'sidebar:expanded-groups:v1';
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(expandedGroups));
    } catch {
      // ignore
    }
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !(prev[groupId] ?? true) }));
  };

  // Fetch tenant details from API (preferred over context for latest data)
  const { data: tenantMe } = useQuery(
    ['tenant-me-for-sidebar', activeTenant?.id],
    async () => {
      const res = await api.get('/tenants/me');
      return res.data as TenantMe;
    },
    {
      enabled: !!user && !!activeTenant?.id,
      staleTime: 0, // Always refetch when tenant changes
      refetchOnMount: 'always',
    }
  );

  // Prefer tenantMe (from API) over activeTenant (from context) for latest data
  const displayTenantName = tenantMe?.name || activeTenant?.name || accessibleTenants[0]?.name || '';
  const displayTenantType = tenantMe?.type || activeTenant?.type || accessibleTenants[0]?.type || menuContext.tenantType || '';
  const selectedTenantName = displayTenantName;
  const logoUrl = tenantMe?.metadata?.logoUrl as string | undefined;

  // Show empty state if no menu items are visible
  if (filteredMenu.items.length === 0) {
    return (
      <div className="w-64 bg-black text-white flex flex-col h-full">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={`${getApiBaseUrl()}${logoUrl}`}
                alt="Tenant logo"
                className="h-10 w-10 rounded bg-white object-contain border border-gray-800"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-gray-900 border border-gray-800 flex items-center justify-center text-xs font-bold text-primary">
                {getInitials(selectedTenantName)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-primary leading-tight">YDM Platform</h1>
              <p className="text-sm text-gray-400">Client Portal</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-300 mb-1">No Access</p>
            <p className="text-xs text-gray-400">
              You don't have permission to access any menu items.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-black text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={`${getApiBaseUrl()}${logoUrl}`}
              alt="Tenant logo"
              className="h-10 w-10 rounded bg-white object-contain border border-gray-800"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-gray-900 border border-gray-800 flex items-center justify-center text-xs font-bold text-primary">
              {getInitials(selectedTenantName)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-primary leading-tight">YDM Platform</h1>
            <p className="text-sm text-gray-400">Client Portal</p>
          </div>
        </div>
        {displayTenantName ? (
          <div className="mt-3">
            <p className="text-base font-semibold text-white">{displayTenantName}</p>
            {displayTenantType ? (
              <p className="text-sm text-gray-300 mt-0.5">{displayTenantType}</p>
            ) : null}
            <div className="mt-2">
              <TenantSwitcher />
            </div>
          </div>
        ) : tenantLoading ? (
          <p className="text-xs text-gray-500 mt-1">Loading...</p>
        ) : menuContext.tenantType ? (
          <p className="text-base font-semibold text-white mt-3">{menuContext.tenantType}</p>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="py-4">
          {filteredMenu.items.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              location={location}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-white">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

interface MenuItemProps {
  item: any;
  location: any;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
}

function normalizePath(p: string) {
  const s = String(p || '').trim();
  if (!s) return '/';
  if (s === '/') return '/';
  return s.replace(/\/+$/, '');
}

function isActivePath(itemPath: string, currentPath: string, opts?: { exact?: boolean }) {
  const item = normalizePath(itemPath);
  const cur = normalizePath(currentPath);

  if (opts?.exact) return cur === item;

  // Default: consider active when exact match OR child route under the same path segment
  // Example: /cdp/customers active for /cdp/customers/123
  if (cur === item) return true;
  return cur.startsWith(item + '/');
}

function MenuItem({ item, location, expandedGroups, onToggleGroup }: MenuItemProps) {
  // Avoid double-highlight for dashboard menu:
  // - "/dashboard" should be active only when exactly on "/dashboard"
  const isActive =
    item.path &&
    isActivePath(item.path, location.pathname, {
      exact: normalizePath(item.path) === '/dashboard',
    });
  const hasChildren = item.children && item.children.length > 0;

  // Check if any child is active
  const hasActiveChild = hasChildren && item.children.some((child: any) => {
    if (child.path) {
      return isActivePath(child.path, location.pathname, {
        exact: normalizePath(child.path) === '/dashboard',
      });
    }
    if (child.children) {
      return child.children.some((grandChild: any) => 
        grandChild.path &&
        isActivePath(grandChild.path, location.pathname, {
          exact: normalizePath(grandChild.path) === '/dashboard',
        })
      );
    }
    return false;
  });

  // Category/Group Header (parent with children, no path)
  if (hasChildren && !item.path) {
    const groupId = String(item.id || item.label || '');
    const expanded = hasActiveChild || expandedGroups[groupId] !== false; // default expanded
    return (
      <div className="mb-6">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onToggleGroup(groupId)}
          className={`w-full flex items-center gap-3 px-4 py-2 mb-2 rounded-md transition-colors ${
            expanded ? 'bg-gray-900/60' : 'hover:bg-gray-900/60'
          }`}
        >
          {item.icon ? (
            <MenuIcon name={item.icon} className="w-4 h-4 text-primary flex-shrink-0" />
          ) : (
            <span className="w-4 h-4 flex-shrink-0" />
          )}
          <div className="text-xs font-bold text-primary uppercase tracking-wider flex-1 text-left truncate">
            {String(item.label || '').replace(/[🏠👥🎯💼🧲🤝📞📣🎨📊🔌⚙️💬]/g, '').trim()}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded ? (
          <div className="space-y-0.5">
            {item.children.map((child: any) => (
              <MenuItem
                key={child.id}
                item={child}
                location={location}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // Parent with path and children (like "Leads" with sub-items)
  if (hasChildren && item.path) {
    return (
      <div className="mb-4">
        <Link
          to={item.path}
          className={`group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
            isActive
              ? 'bg-primary text-base font-medium'
              : 'text-white hover:bg-gray-900'
          }`}
        >
          {item.icon && (
            <MenuIcon
              name={item.icon}
              className={`w-5 h-5 ${isActive ? 'text-black' : 'text-white'}`}
            />
          )}
          <span className="flex-1">{item.label.replace(/[🧲🤝📞📣]/g, '').trim()}</span>
        </Link>
        {/* Sub-items */}
        <div className="ml-4 mt-0.5 space-y-0.5">
          {item.children.map((child: any) => (
            <MenuItem
              key={child.id}
              item={child}
              location={location}
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
            />
          ))}
        </div>
      </div>
    );
  }

  // Regular menu item (leaf node)
  if (!item.path) {
    return null;
  }

  return (
    <Link
      to={item.path}
      className={`group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        isActive
          ? 'bg-yellow-400 text-black font-medium'
          : 'text-white hover:bg-gray-900'
      }`}
    >
      {item.icon && (
        <MenuIcon
          name={item.icon}
          className={`w-5 h-5 ${isActive ? 'text-black' : 'text-white'}`}
        />
      )}
      <span className="flex-1">{item.label.replace(/[1️⃣2️⃣3️⃣4️⃣]/g, '').trim()}</span>
    </Link>
  );
}
