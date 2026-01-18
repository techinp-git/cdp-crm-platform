import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  requiresSuperAdmin?: boolean;
  requiresTenant?: boolean;
}

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/tenants', label: 'Tenants', requiresSuperAdmin: true },
    { path: '/users', label: 'Users' },
    { path: '/settings', label: 'Settings' },
  ];

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // Super admin only items
    if (item.requiresSuperAdmin && !user?.isSuperAdmin) {
      return false;
    }
    return true;
  });

  const isSuperAdmin = user?.isSuperAdmin || false;
  const displayRole = isSuperAdmin ? 'Super Admin' : 'Admin';

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-base text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-primary">YDM Platform</h1>
          <p className="text-sm text-gray-400">{displayRole}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-base font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-base">Admin Portal</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary-text">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-error text-white rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
