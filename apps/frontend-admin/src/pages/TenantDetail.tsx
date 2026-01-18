import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminApi } from '../services/api';

export function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Get tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery(
    ['tenant', id],
    () => adminApi.getTenant(id!),
    { enabled: !!id }
  );

  // Get tenant roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery(
    ['tenant-roles', id],
    () => adminApi.getTenantRoles(id!),
    { enabled: !!id }
  );

  // Create role mutation
  const createRoleMutation = useMutation(
    async (data: typeof roleForm) => {
      // Call role creation endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': id || '',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create role');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tenant-roles', id]);
        setShowCreateRoleModal(false);
        setRoleForm({ name: '', slug: '', description: '' });
      },
    }
  );

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (tenantLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Tenant not found</p>
        <button onClick={() => navigate('/tenants')} className="mt-4 text-primary">
          Back to Tenants
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/tenants')}
            className="text-primary hover:text-yellow-500 mb-2"
          >
            ← Back to Tenants
          </button>
          <h1 className="text-2xl font-bold text-base">{tenant.name}</h1>
          <p className="text-sm text-secondary-text mt-1">
            {tenant.type} • {tenant.status}
          </p>
        </div>
        <button
          onClick={() => setShowCreateRoleModal(true)}
          className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
        >
          + Create Role
        </button>
      </div>

      {/* Tenant Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tenant Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-secondary-text">Slug</label>
            <p className="text-base font-medium">{tenant.slug}</p>
          </div>
          <div>
            <label className="text-sm text-secondary-text">Type</label>
            <p className="text-base font-medium">{tenant.type}</p>
          </div>
          <div>
            <label className="text-sm text-secondary-text">Status</label>
            <p className="text-base font-medium">{tenant.status}</p>
          </div>
          <div>
            <label className="text-sm text-secondary-text">Plan</label>
            <p className="text-base font-medium">{tenant.plan || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Roles Management Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Roles Management</h2>
          <p className="text-sm text-secondary-text mt-1">
            Manage roles for this tenant. Users can have different roles in different tenants.
          </p>
        </div>

        {rolesLoading ? (
          <div className="p-6 text-center text-secondary-text">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-secondary-text mb-4">No roles created yet</p>
            <button
              onClick={() => setShowCreateRoleModal(true)}
              className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
            >
              Create First Role
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {roles.map((role: any) => (
                  <tr key={role.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{role.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-background px-2 py-1 rounded">{role.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.isSystem ? (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium">
                          System
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!role.isSystem && (
                        <button className="text-error hover:text-red-600">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Create Role</h2>
                <button
                  onClick={() => setShowCreateRoleModal(false)}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRoleMutation.mutate(roleForm);
              }}
              className="p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="e.g., Manager, Editor"
                    value={roleForm.name}
                    onChange={(e) => {
                      setRoleForm({
                        ...roleForm,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Slug <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="manager"
                    value={roleForm.slug}
                    onChange={(e) =>
                      setRoleForm({
                        ...roleForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                  />
                  <p className="text-xs text-secondary-text mt-1">
                    URL-friendly identifier (auto-generated from name)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md"
                    rows={3}
                    placeholder="Describe the role's permissions..."
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  />
                </div>
              </div>

              {createRoleMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {createRoleMutation.error instanceof Error
                    ? createRoleMutation.error.message
                    : 'Failed to create role'}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isLoading || !roleForm.name || !roleForm.slug}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createRoleMutation.isLoading ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
