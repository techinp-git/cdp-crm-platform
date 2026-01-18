import { useQuery } from 'react-query';
import { adminApi } from '../services/api';

export function Dashboard() {
  const { data: stats, isLoading } = useQuery('admin-stats', adminApi.getStats);

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Super Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Total Tenants</h3>
          <p className="text-3xl font-bold text-base">{stats?.totalTenants || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Active Tenants</h3>
          <p className="text-3xl font-bold text-success">{stats?.activeTenants || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-base">{stats?.totalUsers || 0}</p>
        </div>
      </div>
    </div>
  );
}
