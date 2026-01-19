import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

export function ContactCompanyData() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [syncConfig, setSyncConfig] = useState({
    apiUrl: '',
    apiKey: '',
    syncFrequency: 'manual',
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // Get tenant ID from TenantContext
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Get company customers list
  const { data: customersResponse } = useQuery(
    ['company-customers', tenantId],
    async () => {
      if (!tenantId) return [];

      const response = await fetch(`${apiUrl}/customers?type=COMPANY&limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
    {
      enabled: !!tenantId,
    }
  );

  // Handle response: { data: [...] } or array
  const customers = Array.isArray(customersResponse?.data)
    ? customersResponse.data
    : (Array.isArray(customersResponse) ? customersResponse : []);

  // Get contacts list with pagination (filtered by customerId if selected)
  const { data: contactsResponse, isLoading, error: contactsError } = useQuery(
    ['contacts-company', tenantId, selectedCustomerId, currentPage, limit],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (selectedCustomerId) {
        params.append('customerId', selectedCustomerId);
      }

      const response = await fetch(`${apiUrl}/contacts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch contacts' }));
        throw new Error(errorData.message || 'Failed to fetch contacts');
      }
      return response.json();
    },
    {
      enabled: !!tenantId,
      retry: 1,
    }
  );

  // Handle response structure: { data: [], total, page, limit, totalPages } or array directly
  const contacts = Array.isArray(contactsResponse?.data) 
    ? contactsResponse.data 
    : (Array.isArray(contactsResponse) ? contactsResponse : []);
  const total = contactsResponse?.total ?? (Array.isArray(contactsResponse) ? contactsResponse.length : 0);
  const totalPages = contactsResponse?.totalPages ?? Math.ceil(total / limit);

  // Import file mutation
  const importMutation = useMutation(
    async ({ file, customerId }: { file: File; customerId: string }) => {
      if (!tenantId) throw new Error('No tenant selected');
      if (!customerId) throw new Error('Please select a company customer first');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);

      const response = await fetch(`${apiUrl}/contacts/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contacts-company', tenantId, selectedCustomerId]);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
      },
    }
  );

  // Sync API mutation
  const syncMutation = useMutation(
    async ({ config, customerId }: { config: typeof syncConfig; customerId?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');
      if (!customerId) throw new Error('Please select a company customer to sync contacts to');

      const response = await fetch(`${apiUrl}/contacts/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ ...config, customerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contacts-company', tenantId, selectedCustomerId]);
        setShowSyncModal(false);
        setSyncConfig({ apiUrl: '', apiKey: '', syncFrequency: 'manual' });
      },
    }
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Preview CSV
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(0, 6);
        const preview = lines
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return {
              firstName: values[0] || '',
              lastName: values[1] || '',
              email: values[2] || '',
              phone: values[3] || '',
              title: values[4] || '',
            };
          });
        setImportPreview(preview);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    if (!selectedCustomerId) {
      alert('Please select a company customer to import contacts to');
      return;
    }
    importMutation.mutate({ file: importFile, customerId: selectedCustomerId });
  };

  const downloadSampleFile = () => {
    const sampleCSV = `firstName,lastName,email,phone,title,department
สมชาย,ใจดี,somchai@company.co.th,+66812345678,Manager,Sales
สมหญิง,รักงาน,somying@company.co.th,+66823456789,Director,Marketing
วิชัย,มั่งคั่ง,wichai@company.co.th,+66834567890,CEO,Executive
วิไล,สวยงาม,wilai@company.co.th,+66845678901,CTO,Technology
ประเสริฐ,ดีเลิศ,prasert@company.co.th,+66856789012,CFO,Finance`;

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'contact_company_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSync = () => {
    if (!selectedCustomerId) {
      alert('Please select a company customer to sync contacts to');
      return;
    }
    if (!syncConfig.apiUrl || !syncConfig.apiKey) {
      alert('Please provide API URL and API Key');
      return;
    }
    syncMutation.mutate({ config: syncConfig, customerId: selectedCustomerId });
  };

  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  if (contactsError) {
    return (
      <div className="text-center py-12">
        <div className="text-error mb-2">Error loading contacts</div>
        <div className="text-sm text-secondary-text">
          {contactsError instanceof Error ? contactsError.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Contact (Company)</h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage contacts for companies. Filter by company to view specific contacts.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-info text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600"
          >
            📥 Import File
          </button>
          <button
            onClick={() => setShowSyncModal(true)}
            className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
          >
            🔄 Sync from API
          </button>
        </div>
      </div>

      {/* Company Filter */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">
          Filter by Company Customer (Optional)
        </label>
        <select
          className="w-full px-3 py-2 border border-border rounded-md"
          value={selectedCustomerId}
          onChange={(e) => {
            setSelectedCustomerId(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">-- All Company Customers --</option>
          {customers.map((customer: any) => {
            const identifiers = customer.identifiers || {};
            const profile = customer.profile || {};
            const companyName = profile.companyName || identifiers.company || profile.name || identifiers.name || '-';
            const industry = profile.industry || identifiers.industry || '';
            return (
              <option key={customer.id} value={customer.id}>
                {companyName} {industry ? `(${industry})` : ''}
              </option>
            );
          })}
        </select>
        {selectedCustomer && (
          <div className="mt-3 p-3 bg-background rounded-md">
            <div className="text-sm">
              <div className="font-medium">
                Filtering by: {(selectedCustomer.profile?.companyName || selectedCustomer.identifiers?.company || selectedCustomer.profile?.name || selectedCustomer.identifiers?.name || selectedCustomer.id)}
              </div>
              {(selectedCustomer.profile?.industry || selectedCustomer.identifiers?.industry) && (
                <div className="text-secondary-text">
                  Industry: {selectedCustomer.profile?.industry || selectedCustomer.identifiers?.industry}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Contacts</div>
          <div className="text-2xl font-bold text-base">{total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Import</div>
          <div className="text-sm text-base">-</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Sync</div>
          <div className="text-sm text-base">-</div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {selectedCustomer
              ? `Contacts for ${(selectedCustomer.profile?.companyName || selectedCustomer.identifiers?.company || selectedCustomer.profile?.name || selectedCustomer.identifiers?.name || selectedCustomer.id)}`
              : 'All Contacts'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {contacts && contacts.length > 0 ? (
                  contacts.map((contact: any) => {
                    const customer = contact.customer || null;
                    const customerProfile = customer?.profile || {};
                    const customerIdentifiers = customer?.identifiers || {};
                    const companyName = customer
                      ? (customerProfile.companyName || customerIdentifiers.company || customerProfile.name || customerIdentifiers.name || '-')
                      : '-';
                    return (
                      <tr key={contact.id} className="hover:bg-background">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">
                          {contact.firstName || ''} {contact.lastName || ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {contact.title || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {contact.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {contact.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {contact.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    {selectedCustomerId
                      ? 'No contacts found for this company customer. Import a file or sync from API to get started.'
                      : 'No contacts found. Import a file or sync from API to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-secondary-text">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} contacts
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border rounded-md text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-primary text-base border-primary'
                        : 'border-border hover:bg-background'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import File Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Import Contacts from File</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Select File (CSV) <span className="text-error">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleFile}
                    className="text-sm text-primary hover:text-yellow-500 font-medium flex items-center gap-1"
                  >
                    📥 Download Sample CSV
                  </button>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
                <p className="text-xs text-secondary-text mt-1">
                  Supported formats: CSV
                </p>
                <div className="mt-2 p-3 bg-background rounded-md text-xs">
                  <p className="font-medium mb-1">Required columns:</p>
                  <ul className="list-disc list-inside text-secondary-text space-y-0.5">
                    <li><code className="bg-white px-1 rounded">firstName</code> - First Name</li>
                    <li><code className="bg-white px-1 rounded">lastName</code> - Last Name</li>
                    <li><code className="bg-white px-1 rounded">email</code> - Email (optional)</li>
                    <li><code className="bg-white px-1 rounded">phone</code> - Phone (optional)</li>
                    <li><code className="bg-white px-1 rounded">title</code> - Job Title (optional)</li>
                    <li><code className="bg-white px-1 rounded">department</code> - Department (optional)</li>
                  </ul>
                </div>
              </div>

              {importPreview.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Preview (First 5 rows)</label>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-background">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium">First Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Last Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Phone</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Title</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{row.firstName}</td>
                            <td className="px-4 py-2 text-sm">{row.lastName}</td>
                            <td className="px-4 py-2 text-sm">{row.email}</td>
                            <td className="px-4 py-2 text-sm">{row.phone}</td>
                            <td className="px-4 py-2 text-sm">{row.title}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importMutation.isError && (
                <div className="mb-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {importMutation.error instanceof Error
                    ? importMutation.error.message
                    : 'Failed to import file'}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || !selectedCustomerId || importMutation.isLoading}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {importMutation.isLoading ? 'Importing...' : 'Import File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync API Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Sync Contacts from External API</h2>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-secondary-text hover:text-base text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API URL <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://crm.example.com/api/contacts"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.apiUrl}
                    onChange={(e) => setSyncConfig({ ...syncConfig, apiUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API Key <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter API key"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.apiKey}
                    onChange={(e) => setSyncConfig({ ...syncConfig, apiKey: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sync Frequency</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.syncFrequency}
                    onChange={(e) => setSyncConfig({ ...syncConfig, syncFrequency: e.target.value })}
                  >
                    <option value="manual">Manual</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {syncMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {syncMutation.error instanceof Error
                    ? syncMutation.error.message
                    : 'Failed to sync from API'}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSync}
                  disabled={!selectedCustomerId || !syncConfig.apiUrl || !syncConfig.apiKey || syncMutation.isLoading}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {syncMutation.isLoading ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
