import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerApi } from '../../services/api';

interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export function ErpCustomerData() {
  const queryClient = useQueryClient();
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

  // Get customers list with pagination
  const { data: customersResponse, isLoading } = useQuery(
    ['erp-customers', currentPage, limit],
    async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/customers?page=${currentPage}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': localStorage.getItem('activeTenantId') || '',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    }
  );

  const customers = customersResponse?.data || (Array.isArray(customersResponse) ? customersResponse : []);
  const total = customersResponse?.total || customers?.length || 0;
  const totalPages = customersResponse?.totalPages || 1;

  // Import file mutation
  const importMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/customers/erp/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || '',
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
        queryClient.invalidateQueries(['erp-customers']);
        queryClient.invalidateQueries('customers');
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
      },
    }
  );

  // Sync API mutation
  const syncMutation = useMutation(
    async (config: typeof syncConfig) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/customers/erp/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || '',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['erp-customers']);
        queryClient.invalidateQueries('customers');
        setShowSyncModal(false);
        setSyncConfig({ apiUrl: '', apiKey: '', syncFrequency: 'manual' });
      },
    }
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Preview CSV/Excel
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(0, 6); // First 5 rows for preview
        const preview = lines
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return {
              email: values[0] || '',
              firstName: values[1] || '',
              lastName: values[2] || '',
              phone: values[3] || '',
            };
          });
        setImportPreview(preview);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const downloadSampleFile = () => {
    // Create sample CSV content
    const sampleCSV = `email,firstName,lastName,phone,company,address,country,city,postalCode
john.smith@example.com,John,Smith,+66123456789,Acme Corporation,123 Business St,Bangkok,Thailand,10110
jane.doe@example.com,Jane,Doe,+66987654321,Tech Solutions,456 Tech Avenue,Bangkok,Thailand,10220
bob.johnson@example.com,Bob,Johnson,+66234567890,Global Inc,789 World Road,Chiang Mai,Thailand,50000
alice.brown@example.com,Alice,Brown,+66345678901,Startup Co,321 Innovation Lane,Phuket,Thailand,83000
charlie.wilson@example.com,Charlie,Wilson,+66456789012,Enterprise Ltd,654 Corporate Blvd,Bangkok,Thailand,10330`;

    // Create blob and download
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
           link.setAttribute('download', 'customer_company_b2b_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSync = () => {
    if (!syncConfig.apiUrl || !syncConfig.apiKey) {
      alert('Please provide API URL and API Key');
      return;
    }
    syncMutation.mutate(syncConfig);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-base">Customer (Company)</h1>
                <p className="text-sm text-secondary-text mt-1">
                  Manage B2B company customers - Import from files or sync from external ERP system
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Customers</div>
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

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Customer Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {customers && customers.length > 0 ? (
                       customers.map((customer: any) => {
                         const identifiers = customer.identifiers || {};
                         const profile = customer.profile || {};
                         const isCompany = customer.type === 'COMPANY';
                         
                         return (
                           <tr key={customer.id} className="hover:bg-background">
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">
                               {isCompany 
                                 ? (profile.companyName || identifiers.company || '-')
                                 : ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim() || '-'}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                               {isCompany 
                                 ? (profile.contactPerson || '-')
                                 : '-'}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                               {identifiers.email || identifiers.contactEmail || '-'}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                               {identifiers.phone || identifiers.contactPhone || '-'}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                               {isCompany ? (profile.industry || '-') : '-'}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                               <span className={`px-2 py-1 rounded text-xs font-medium ${
                                 customer.type === 'COMPANY' 
                                   ? 'bg-primary/20 text-primary' 
                                   : 'bg-info/20 text-info'
                               }`}>
                                 {customer.type || 'INDIVIDUAL'}
                               </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                               {new Date(customer.createdAt).toLocaleDateString()}
                             </td>
                           </tr>
                         );
                       })
                     ) : (
                       <tr>
                         <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    No customer data found. Import a file or sync from API to get started.
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} customers
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
                <h2 className="text-xl font-bold">Import Customer Data from File</h2>
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
                    Select File (CSV or Excel) <span className="text-error">*</span>
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
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
                <p className="text-xs text-secondary-text mt-1">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
                <div className="mt-2 p-3 bg-background rounded-md text-xs">
                  <p className="font-medium mb-1">Required columns:</p>
                  <ul className="list-disc list-inside text-secondary-text space-y-0.5">
                    <li><code className="bg-white px-1 rounded">email</code> - Customer email address</li>
                    <li><code className="bg-white px-1 rounded">firstName</code> - Customer first name</li>
                    <li><code className="bg-white px-1 rounded">lastName</code> - Customer last name</li>
                    <li><code className="bg-white px-1 rounded">phone</code> - Customer phone number (optional)</li>
                    <li><code className="bg-white px-1 rounded">company</code> - Company name (optional)</li>
                    <li><code className="bg-white px-1 rounded">address</code> - Street address (optional)</li>
                    <li><code className="bg-white px-1 rounded">city</code> - City (optional)</li>
                    <li><code className="bg-white px-1 rounded">country</code> - Country (optional)</li>
                    <li><code className="bg-white px-1 rounded">postalCode</code> - Postal/ZIP code (optional)</li>
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
                          <th className="px-4 py-2 text-left text-xs font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">First Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Last Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{row.email}</td>
                            <td className="px-4 py-2 text-sm">{row.firstName}</td>
                            <td className="px-4 py-2 text-sm">{row.lastName}</td>
                            <td className="px-4 py-2 text-sm">{row.phone}</td>
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
                  disabled={!importFile || importMutation.isLoading}
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
                <h2 className="text-xl font-bold">Sync Customer Data from External API</h2>
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
                    placeholder="https://erp.example.com/api/customers"
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
                  disabled={!syncConfig.apiUrl || !syncConfig.apiKey || syncMutation.isLoading}
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
