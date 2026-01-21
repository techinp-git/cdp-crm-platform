import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';

export function TenantList() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'B2B' as 'B2B' | 'B2C' | 'HYBRID',
    status: 'TRIAL' as 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED',
    plan: '',
  });
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery('tenants', adminApi.getTenants);

  const createMutation = useMutation(adminApi.createTenant, {
    onSuccess: () => {
      queryClient.invalidateQueries('tenants');
      closeCreateModal();
      setFormData({
        name: '',
        slug: '',
        type: 'B2B',
        status: 'TRIAL',
        plan: '',
      });
    },
  });

  const closeCreateModal = () => {
    setShowCreateModal(false);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoFile) {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('slug', formData.slug);
      fd.append('type', formData.type);
      fd.append('status', formData.status);
      if (formData.plan) fd.append('plan', formData.plan);
      fd.append('logo', logoFile);
      createMutation.mutate(fd as any);
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-base">Tenants Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
        >
          + Add Tenant
        </button>
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Create New Tenant</h2>
                <button
                  onClick={closeCreateModal}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Logo (Optional)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border border-border bg-background overflow-hidden flex items-center justify-center">
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Tenant logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-secondary-text text-2xl">🖼️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                          setLogoFile(file);
                          setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                        }}
                      />
                      <p className="text-xs text-secondary-text mt-1">PNG/JPG/WebP • Max 5MB</p>
                    </div>
                    {(logoFile || logoPreviewUrl) && (
                      <button
                        type="button"
                        className="text-sm text-secondary-text hover:text-base"
                        onClick={() => {
                          if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                          setLogoFile(null);
                          setLogoPreviewUrl(null);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tenant Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="e.g., Acme Corporation"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
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
                    placeholder="acme-corporation"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                    }
                  />
                  <p className="text-xs text-secondary-text mt-1">
                    URL-friendly identifier (auto-generated from name)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tenant Type <span className="text-error">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'B2B' })}
                      className={`p-4 border-2 rounded-lg text-center transition ${
                        formData.type === 'B2B'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">🏢</div>
                      <div className="font-semibold">B2B</div>
                      <div className="text-xs text-secondary-text">Business to Business</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'B2C' })}
                      className={`p-4 border-2 rounded-lg text-center transition ${
                        formData.type === 'B2C'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">👥</div>
                      <div className="font-semibold">B2C</div>
                      <div className="text-xs text-secondary-text">Business to Consumer</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'HYBRID' })}
                      className={`p-4 border-2 rounded-lg text-center transition ${
                        formData.type === 'HYBRID'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">🔄</div>
                      <div className="font-semibold">HYBRID</div>
                      <div className="text-xs text-secondary-text">Mixed Model</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as typeof formData.status,
                      })
                    }
                  >
                    <option value="TRIAL">Trial</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Plan (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="e.g., starter, professional, enterprise"
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  />
                </div>
              </div>

              {createMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create tenant'}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {tenants?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                  No tenants found. Click "Add Tenant" to create your first tenant.
                </td>
              </tr>
            ) : (
              tenants?.map((tenant: any) => (
                <tr key={tenant.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{tenant.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {tenant.slug}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        tenant.type === 'B2B'
                          ? 'bg-blue-100 text-blue-700'
                          : tenant.type === 'B2C'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {tenant.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        tenant.status === 'ACTIVE'
                          ? 'bg-success/20 text-success'
                          : tenant.status === 'TRIAL'
                          ? 'bg-warning/20 text-warning'
                          : tenant.status === 'SUSPENDED'
                          ? 'bg-error/20 text-error'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{tenant.plan || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/tenants/${tenant.id}`}
                      className="text-primary hover:text-yellow-500 font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

