import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { TenantSwitcher } from './TenantSwitcher';
import { menuConfig } from '../config/menu';
import { filterMenu } from '@ydm-platform/utils';
import { useMenuContext } from '../hooks/useMenuContext';

function stripEmoji(label: string) {
  // Keep it consistent with Sidebar’s emoji stripping approach
  return label.replace(/[🏠👥🎯💼🧲🤝📞📣🎨📊🔌⚙️💬1️⃣2️⃣3️⃣4️⃣]/g, '').trim();
}

function computeBestMenuLabel(items: any[], pathname: string) {
  // Find the menu item whose path is the longest prefix of current pathname
  type FlatItem = { path: string; label: string };
  const flat: FlatItem[] = [];

  const walk = (nodes: any[]) => {
    for (const item of nodes) {
      if (item?.path && typeof item.path === 'string' && item?.label) {
        flat.push({ path: item.path, label: item.label });
      }
      if (Array.isArray(item?.children)) {
        walk(item.children);
      }
    }
  };

  walk(items || []);

  const best = flat
    .filter((i) => pathname === i.path || pathname.startsWith(i.path + '/') || pathname.startsWith(i.path))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (best?.label) return stripEmoji(best.label);
  return 'Dashboard';
}

function usePageTitle(pathname: string) {
  const menuContext = useMenuContext();
  const filteredMenu = filterMenu(menuConfig, menuContext);
  return computeBestMenuLabel(filteredMenu.items || [], pathname);
}

export function Header() {
  const { user, logout } = useAuth();
  const { accessibleTenants } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = usePageTitle(location.pathname);

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-base">{pageTitle}</h2>
      </div>
      <div className="flex items-center space-x-4">
        {accessibleTenants.length > 1 && (
          <TenantSwitcher />
        )}
        <span className="text-sm text-secondary-text">
          {user?.firstName} {user?.lastName} ({user?.email})
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-error text-white rounded-md hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
