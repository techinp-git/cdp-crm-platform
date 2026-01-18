import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useNavigate } from 'react-router-dom';
import { TenantSwitcher } from './TenantSwitcher';

export function Header() {
  const { user, logout } = useAuth();
  const { accessibleTenants } = useTenant();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-base">Dashboard</h2>
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
