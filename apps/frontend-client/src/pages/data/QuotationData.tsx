import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';

interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

interface Quotation {
  id: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: string;
  validUntil?: string;
  description?: string;
  createdAt: string;
}

export function QuotationData() {
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

  // Get quotations list with pagination
  const { data: quotationsResponse, isLoading } = useQuery(
    ['quotations', currentPage, limit],
    async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/quotations?page=${currentPage}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': localStorage.getItem('activeTenantId') || '',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch quotations');
      }
      return response.json();
    }
  );

  const quotations = quotationsResponse?.data || [];
  const total = quotationsResponse?.total || 0;
  const totalPages = quotationsResponse?.totalPages || 1;

  // Import file mutation
  const importMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/quotations/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('activeTenantId') || '',
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
        queryClient.invalidateQueries(['quotations']);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
      },
    }
  );

  // Sync API mutation
  const syncMutation = useMutation(
    async (config: typeof syncConfig) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/quotations/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('activeTenantId') || '',
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
        queryClient.invalidateQueries(['quotations']);
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
              quotationNumber: values[0] || '',
              customerName: values[1] || '',
              customerEmail: values[2] || '',
              amount: values[3] || '',
              status: values[4] || '',
              issueDate: values[5] || '',
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
    const sampleCSV = `quotationNumber,customerName,customerEmail,customerPhone,amount,currency,status,issueDate,validUntil,description
QT-2024-001,John Smith,john.smith@example.com,+66123456789,50000,THB,PENDING,2024-01-15,2024-02-15,Product A and B quotation
QT-2024-002,Jane Doe,jane.doe@example.com,+66987654321,75000,THB,ACCEPTED,2024-01-20,2024-02-20,Service package quotation
QT-2024-003,Acme Corp,contact@acmecorp.com,+66223456789,120000,THB,APPROVED,2024-01-25,2024-02-25,Bulk order quotation
QT-2024-004,Bob Johnson,bob@example.com,+66334567890,35000,THB,PENDING,2024-02-01,2024-03-01,Custom solution quotation
QT-2024-005,ABC Company,sales@abc.com,+66445678901,98000,THB,REJECTED,2024-02-05,2024-03-05,Annual contract quotation`;

    // Create blob and download
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'quotation_import_sample.csv');
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
          <h1 className="text-2xl font-bold text-base">Quotation</h1>
          <p className="text-sm text-secondary-text mt-1">
            Import quotation data from files or sync from external system (quotations ที่เคยให้ลูกค้า)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Quotations</div>
          <div className="text-2xl font-bold text-base">{total || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Import</div>
          <div className="text-sm text-base">-</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Sync</div>
          <div className="text-sm text-base">-</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Value</div>
          <div className="text-2xl font-bold text-success">
            {quotations?.reduce((sum: number, q: Quotation) => sum + (parseFloat(String(q.amount || 0)) || 0), 0).toLocaleString() || '0'} THB
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Quotation Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Quotation Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {quotations && quotations.length > 0 ? (
                quotations.map((quotation: Quotation) => (
                  <tr key={quotation.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {quotation.quotationNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{quotation.customerName}</div>
                      {quotation.customerEmail && (
                        <div className="text-xs text-secondary-text">{quotation.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium">{parseFloat(String(quotation.amount || 0)).toLocaleString()}</div>
                      <div className="text-xs text-secondary-text">{quotation.currency || 'THB'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          quotation.status === 'ACCEPTED' || quotation.status === 'APPROVED'
                            ? 'bg-success/20 text-success'
                            : quotation.status === 'PENDING'
                            ? 'bg-warning/20 text-warning'
                            : quotation.status === 'REJECTED' || quotation.status === 'CANCELLED'
                            ? 'bg-error/20 text-error'
                            : 'bg-info/20 text-info'
                        }`}
                      >
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {new Date(quotation.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    No quotation data found. Import a file or sync from API to get started.
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} quotations
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
                <h2 className="text-xl font-bold">Import Quotation Data from File</h2>
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
                    <li><code className="bg-white px-1 rounded">quotationNumber</code> - Quotation reference number (e.g., QT-2024-001)</li>
                    <li><code className="bg-white px-1 rounded">customerName</code> - Customer name</li>
                    <li><code className="bg-white px-1 rounded">customerEmail</code> - Customer email (optional)</li>
                    <li><code className="bg-white px-1 rounded">customerPhone</code> - Customer phone (optional)</li>
                    <li><code className="bg-white px-1 rounded">amount</code> - Quotation amount (number)</li>
                    <li><code className="bg-white px-1 rounded">currency</code> - Currency code (e.g., THB, USD)</li>
                    <li><code className="bg-white px-1 rounded">status</code> - Status (PENDING, ACCEPTED, APPROVED, REJECTED, CANCELLED)</li>
                    <li><code className="bg-white px-1 rounded">issueDate</code> - Issue date (YYYY-MM-DD)</li>
                    <li><code className="bg-white px-1 rounded">validUntil</code> - Valid until date (YYYY-MM-DD, optional)</li>
                    <li><code className="bg-white px-1 rounded">description</code> - Description (optional)</li>
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
                          <th className="px-4 py-2 text-left text-xs font-medium">Quotation #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Customer</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Issue Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{row.quotationNumber}</td>
                            <td className="px-4 py-2 text-sm">{row.customerName}</td>
                            <td className="px-4 py-2 text-sm">{row.amount}</td>
                            <td className="px-4 py-2 text-sm">{row.status}</td>
                            <td className="px-4 py-2 text-sm">{row.issueDate}</td>
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
                <h2 className="text-xl font-bold">Sync Quotation Data from External API</h2>
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
                    placeholder="https://erp.example.com/api/quotations"
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
