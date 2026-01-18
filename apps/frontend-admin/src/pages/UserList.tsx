import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../services/api';

export function UserList() {
  const { activeTenant, accessibleTenants: tenantContextTenants } = useTenant();
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin || false;
  const queryClient = useQueryClient();

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    tenantId: activeTenant?.id || '',
  });

  // Assign User Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    tenantId: '',
    roleId: '',
  });

  // For super admin, show all users grouped by tenant
  // For non-super admin, show users from their tenant
  const tenantId = activeTenant?.id || (isSuperAdmin ? null : undefined);

  // Get tenants (for super admin to aggregate users)
  const { data: accessibleTenants } = useQuery(
    ['accessible-tenants-for-users'],
    () => adminApi.getAccessibleTenants(),
    {
      enabled: isSuperAdmin && !tenantId,
      retry: 2,
    }
  );

  // Get users from all tenants (for super admin view)
  const { data: allTenantUsers, isLoading: isLoadingAllTenants, error: allTenantUsersError } = useQuery(
    ['all-tenant-users', accessibleTenants?.length],
    async () => {
      if (!accessibleTenants || accessibleTenants.length === 0) {
        return [];
      }
      // Fetch users from all tenants in parallel
      const userPromises = accessibleTenants.map((tenant: any) =>
        adminApi.getTenantUsers(tenant.id).catch((err) => {
          console.error(`Failed to fetch users from tenant ${tenant.id}:`, err);
          return [];
        })
      );
      const usersArrays = await Promise.all(userPromises);
      // Flatten and deduplicate by user ID, aggregate tenant memberships
      const userMap = new Map();
      usersArrays.forEach((tenantUsers: any[], tenantIndex: number) => {
        const tenant = accessibleTenants[tenantIndex];
        if (!tenant) return;
        tenantUsers.forEach((user: any) => {
          if (!user || !user.id) return;
          if (!userMap.has(user.id)) {
            userMap.set(user.id, { ...user, tenantMemberships: [], tenantNames: [] });
          }
          const existingUser = userMap.get(user.id);
          // Convert tenantMembership to tenantMemberships array
          if (user.tenantMembership) {
            existingUser.tenantMemberships.push({
              tenantId: tenant.id,
              tenantName: tenant.name,
              roles: user.tenantMembership.roles || [],
              status: user.tenantMembership.status,
            });
            // Also track tenant names for easy access
            if (!existingUser.tenantNames.includes(tenant.name)) {
              existingUser.tenantNames.push(tenant.name);
            }
          }
        });
      });
      return Array.from(userMap.values());
    },
    {
      enabled: isSuperAdmin && !tenantId && !!accessibleTenants && accessibleTenants.length > 0,
      retry: 2,
    }
  );

  // Get all users (for assign modal)
  const { data: allUsers } = useQuery(
    'all-users',
    () => adminApi.getAllUsers().catch(() => []),
    {
      enabled: showAssignModal,
    }
  );

  // Get tenant users (when tenant is selected)
  const { data: tenantUsers, isLoading: isLoadingTenantUsers, error: tenantUsersError } = useQuery(
    ['tenant-users', tenantId],
    () => {
      if (tenantId) {
        return adminApi.getTenantUsers(tenantId);
      }
      return Promise.resolve([]);
    },
    {
      enabled: !!tenantId,
    }
  );

  // Determine which data to use
  const users = tenantId ? tenantUsers : (isSuperAdmin ? allTenantUsers : []);
  const isLoading = tenantId ? isLoadingTenantUsers : (isSuperAdmin ? isLoadingAllTenants : false);
  const error = tenantId ? tenantUsersError : allTenantUsersError;

  // Get roles for selected tenant in assign form
  const { data: assignTenantRoles } = useQuery(
    ['tenant-roles', assignForm.tenantId],
    () => adminApi.getTenantRoles(assignForm.tenantId),
    {
      enabled: !!assignForm.tenantId,
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(
    (data: any) => adminApi.createUser(data, data.tenantId || undefined),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-users');
        queryClient.invalidateQueries('tenant-users');
        setShowCreateUserModal(false);
        setCreateUserForm({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          tenantId: activeTenant?.id || '',
        });
      },
    }
  );

  // Assign user mutation
  const assignMutation = useMutation(
    ({ userId, tenantId, roleId }: { userId: string; tenantId: string; roleId: string }) =>
      adminApi.assignUserToTenantWithRole(userId, tenantId, roleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenant-users');
        queryClient.invalidateQueries(['tenant-users', assignForm.tenantId]);
        setShowAssignModal(false);
        setAssignForm({ userId: '', tenantId: '', roleId: '' });
      },
    }
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(createUserForm);
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.userId || !assignForm.tenantId || !assignForm.roleId) {
      alert('Please select user, tenant, and role');
      return;
    }
    assignMutation.mutate(assignForm);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 text-error p-4 rounded-md">
        Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Users Management</h1>
          {tenantId && (
            <p className="text-sm text-secondary-text mt-1">
              Users in <span className="font-medium">{tenants?.find((t: any) => t.id === tenantId)?.name || 'selected tenant'}</span>
            </p>
          )}
          {!tenantId && isSuperAdmin && (
            <p className="text-sm text-secondary-text mt-1">
              All users across all tenants
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400"
          >
            + Create User
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 border border-border rounded-md font-medium hover:bg-background"
          >
            Assign User to Tenant
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Create New User</h2>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="user@example.com"
                    value={createUserForm.email}
                    onChange={(e) =>
                      setCreateUserForm({ ...createUserForm, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="••••••"
                    value={createUserForm.password}
                    onChange={(e) =>
                      setCreateUserForm({ ...createUserForm, password: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="John"
                    value={createUserForm.firstName}
                    onChange={(e) =>
                      setCreateUserForm({ ...createUserForm, firstName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="Doe"
                    value={createUserForm.lastName}
                    onChange={(e) =>
                      setCreateUserForm({ ...createUserForm, lastName: e.target.value })
                    }
                  />
                </div>

                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Tenant (Optional)</label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-md"
                      value={createUserForm.tenantId}
                      onChange={(e) =>
                        setCreateUserForm({ ...createUserForm, tenantId: e.target.value })
                      }
                    >
                      <option value="">No tenant (global user)</option>
                      {accessibleTenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary-text mt-1">
                      You can assign user to tenant later
                    </p>
                  </div>
                )}
              </div>

              {createUserMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {createUserMutation.error instanceof Error
                    ? createUserMutation.error.message
                    : 'Failed to create user'}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isLoading}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign User to Tenant Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Assign User to Tenant</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleAssignUser} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select User <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={assignForm.userId}
                    onChange={(e) => {
                      setAssignForm({ ...assignForm, userId: e.target.value, tenantId: '', roleId: '' });
                    }}
                  >
                    <option value="">Choose a user...</option>
                    {allUsers?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.email} {u.firstName || u.lastName ? `(${u.firstName || ''} ${u.lastName || ''})`.trim() : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Tenant <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={assignForm.tenantId}
                    onChange={(e) => {
                      setAssignForm({ ...assignForm, tenantId: e.target.value, roleId: '' });
                    }}
                  >
                    <option value="">Choose a tenant...</option>
                    {(accessibleTenants || tenantContextTenants || []).map((tenant: any) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Role <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    disabled={!assignForm.tenantId}
                    className="w-full px-3 py-2 border border-border rounded-md disabled:bg-gray-100"
                    value={assignForm.roleId}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, roleId: e.target.value })
                    }
                  >
                    <option value="">
                      {assignForm.tenantId ? 'Choose a role...' : 'Select tenant first...'}
                    </option>
                    {assignTenantRoles?.map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.name} {role.isSystem ? '(System)' : ''}
                      </option>
                    ))}
                  </select>
                  {!assignForm.tenantId && (
                    <p className="text-xs text-secondary-text mt-1">
                      Please select a tenant to see available roles
                    </p>
                  )}
                </div>
              </div>

              {assignMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {assignMutation.error instanceof Error
                    ? assignMutation.error.message
                    : 'Failed to assign user'}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isLoading || !assignForm.userId || !assignForm.tenantId || !assignForm.roleId}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {assignMutation.isLoading ? 'Assigning...' : 'Assign User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {users && users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-secondary-text">No users found in this tenant.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Email
                </th>
                {!tenantId && isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Tenants
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Super Admin
                </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-border">
                {users?.map((userItem: any) => {
                  // Handle both singular (from tenant-specific view) and plural (from super admin view)
                  const tenantMemberships = userItem.tenantMemberships || (userItem.tenantMembership ? [userItem.tenantMembership] : []);
                  const tenantNames = userItem.tenantNames || (userItem.tenantMemberships ? userItem.tenantMemberships.map((m: any) => m.tenantName) : []);
                  
                  return (
                  <tr key={userItem.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">
                        {userItem.firstName || userItem.lastName
                          ? `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{userItem.email}</td>
                    {!tenantId && isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenantNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tenantNames.slice(0, 3).map((tenantName: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                              >
                                {tenantName}
                              </span>
                            ))}
                            {tenantNames.length > 3 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">
                                +{tenantNames.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-secondary-text text-sm">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenantMemberships.length > 0 && tenantMemberships.some((m: any) => m.roles && m.roles.length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {tenantMemberships.flatMap((membership: any) =>
                            membership.roles?.map((role: any) => (
                              <span
                                key={`${membership.tenantId || ''}-${role.id}`}
                                className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
                              >
                                {role.name} {membership.tenantName ? `(${membership.tenantName})` : ''}
                              </span>
                            )) || []
                          )}
                        </div>
                      ) : tenantId ? (
                        <span className="text-secondary-text text-sm">No roles</span>
                      ) : (
                        <span className="text-secondary-text text-sm">-</span>
                      )}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        userItem.status === 'ACTIVE'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {userItem.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userItem.isSuperAdmin ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="text-secondary-text text-sm">No</span>
                    )}
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
