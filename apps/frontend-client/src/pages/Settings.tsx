import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { OrganizationSettings } from './settings/OrganizationSettings';
import { TeamManagement } from './settings/TeamManagement';
import { Integrations } from './settings/Integrations';
import { CustomFields } from './settings/CustomFields';
import { SecurityPrivacy } from './settings/SecurityPrivacy';

const settingsMenu = [
  { path: 'organization', label: 'Organization Settings' },
  { path: 'team', label: 'Team Management' },
  { path: 'integrations', label: 'Integrations' },
  { path: 'custom-fields', label: 'Custom Fields' },
  { path: 'security', label: 'Security & Privacy' },
];

export function Settings() {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'organization';

  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Settings</h1>
      <div className="flex gap-6">
        <div className="w-64 bg-white rounded-lg shadow p-4">
          <nav className="space-y-2">
            {settingsMenu.map((item) => (
              <Link
                key={item.path}
                to={`/settings/${item.path}`}
                className={`block px-4 py-2 rounded-md ${
                  currentPath === item.path
                    ? 'bg-primary text-base font-medium'
                    : 'text-secondary-text hover:bg-background'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-1">
          <Routes>
            <Route index element={<Navigate to="organization" replace />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="custom-fields" element={<CustomFields />} />
            <Route path="security" element={<SecurityPrivacy />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
