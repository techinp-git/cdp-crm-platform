import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  metadata?: any;
};

type OrgFormState = {
  companyName: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  primaryColor: string;
  logoFile: File | null;
};

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    'x-tenant-id': localStorage.getItem('activeTenantId') || '',
  } as Record<string, string>;
}

export function OrganizationSettings() {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { data: tenant, isLoading, isError, error } = useQuery(
    ['tenant-me'],
    async () => {
      const response = await fetch(`${getApiBaseUrl()}/tenants/me`, { headers: getAuthHeaders() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || 'Failed to fetch tenant');
      return body as Tenant;
    },
    { staleTime: 60_000 },
  );

  const initialState = useMemo<OrgFormState>(() => {
    const md = tenant?.metadata || {};
    return {
      companyName: tenant?.name || '',
      industry: String(md?.industry || ''),
      website: String(md?.website || ''),
      phone: String(md?.phone || ''),
      address: String(md?.address || ''),
      city: String(md?.city || ''),
      country: String(md?.country || ''),
      primaryColor: String(md?.branding?.primaryColor || md?.primaryColor || '#FCD34D'),
      logoFile: null,
    };
  }, [tenant]);

  const [form, setForm] = useState<OrgFormState>({
    companyName: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    primaryColor: '#FCD34D',
    logoFile: null,
  });

  useEffect(() => {
    if (tenant) setForm(initialState);
  }, [tenant, initialState]);

  const saveMutation = useMutation(
    async (payload: OrgFormState) => {
      const fd = new FormData();
      fd.set('name', payload.companyName);
      fd.set(
        'metadata',
        JSON.stringify({
          industry: payload.industry || undefined,
          website: payload.website || undefined,
          phone: payload.phone || undefined,
          address: payload.address || undefined,
          city: payload.city || undefined,
          country: payload.country || undefined,
          branding: { primaryColor: payload.primaryColor || undefined },
        }),
      );
      if (payload.logoFile) fd.set('logo', payload.logoFile);

      const response = await fetch(`${getApiBaseUrl()}/tenants/me`, {
        method: 'PATCH',
        headers: getAuthHeaders(), // do NOT set Content-Type for multipart
        body: fd,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || 'Failed to save organization settings');
      return body as Tenant;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tenant-me']);
        setSaveMessage('Saved successfully.');
        setTimeout(() => setSaveMessage(null), 3000);
      },
    },
  );

  const onSaveAll = () => {
    setSaveMessage(null);
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-error/10 text-error rounded-md">
        {error instanceof Error ? error.message : 'Failed to load organization settings'}
      </div>
    );
  }

  const currentLogoUrl = tenant?.metadata?.logoUrl as string | undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Organization Settings</h1>

      {saveMessage ? (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-md text-sm">{saveMessage}</div>
      ) : null}
      {saveMutation.isError ? (
        <div className="mb-4 p-3 bg-error/10 text-error rounded-md text-sm">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save settings'}
        </div>
      ) : null}

      {/* Company Profile */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold mb-4">Company Profile</h2>
          <button
            onClick={onSaveAll}
            disabled={saveMutation.isLoading}
            className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400 disabled:opacity-50"
          >
            {saveMutation.isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Enter company name"
              value={form.companyName}
              onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
            />
            <div className="text-xs text-secondary-text mt-1">Saved to `tenants.name`</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={form.industry}
              onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))}
            >
              <option value="">Select industry</option>
              <option value="Retail">Retail</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Services">Services</option>
              <option value="Manufacturing">Manufacturing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="https://example.com"
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="+66..."
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold mb-4">Branding</h2>
          <button
            onClick={onSaveAll}
            disabled={saveMutation.isLoading}
            className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400 disabled:opacity-50"
          >
            {saveMutation.isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Logo</label>
            <div className="border border-border rounded-lg p-4">
              {currentLogoUrl ? (
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src={`${getApiBaseUrl()}${currentLogoUrl}`}
                    alt="Tenant logo"
                    className="h-12 w-12 rounded bg-background object-contain border border-border"
                  />
                  <div className="text-sm text-secondary-text">{currentLogoUrl}</div>
                </div>
              ) : (
                <div className="text-sm text-secondary-text mb-3">No logo uploaded yet.</div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm((s) => ({ ...s, logoFile: e.target.files?.[0] || null }))}
              />
              {form.logoFile ? (
                <div className="text-xs text-secondary-text mt-2">Selected: {form.logoFile.name}</div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex gap-4">
              <input
                type="color"
                className="w-20 h-10 border border-border rounded"
                value={form.primaryColor}
                onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
              />
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-border rounded-md"
                placeholder="#FCD34D"
                value={form.primaryColor}
                onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold mb-4">Business Information</h2>
          <button
            onClick={onSaveAll}
            disabled={saveMutation.isLoading}
            className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400 disabled:opacity-50"
          >
            {saveMutation.isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md"
              rows={3}
              placeholder="Enter business address"
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={form.country}
                onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
              >
                <option value="">Select country</option>
                <option value="United States">United States</option>
                <option value="Thailand">Thailand</option>
                <option value="United Kingdom">United Kingdom</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
