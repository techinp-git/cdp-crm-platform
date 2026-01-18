import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { leadApi } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';

type TabType = 'all' | 'sync' | 'import' | 'website' | 'facebook' | 'namecard';

export function LeadList() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('all');
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

  // Build filter based on active tab
  const getSourceFilter = () => {
    switch (activeTab) {
      case 'all':
        return undefined;
      case 'sync':
        return 'SYNC_API';
      case 'import':
        return 'IMPORT_FILE';
      case 'website':
        return 'WEBSITE_NEWSLETTER';
      case 'facebook':
        return 'FACEBOOK_LEAD_GEN';
      case 'namecard':
        return 'NAMECARD_IMPORT';
      default:
        return undefined;
    }
  };

  // Get tenant ID from TenantContext (reactive to tenant changes)
  const tenantId = activeTenant?.id || '';

  // Get leads list with pagination and filter
  const sourceFilter = getSourceFilter();
  const { data: leadsResponse, isLoading } = useQuery(
    ['leads', tenantId, activeTab, currentPage, limit, sourceFilter],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (sourceFilter) {
        params.append('source', sourceFilter);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/leads?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': tenantId,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
    {
      enabled: !!tenantId, // Only fetch when tenantId is available
    }
  );

  const leads = leadsResponse?.data || (Array.isArray(leadsResponse) ? leadsResponse : []);
  const total = leadsResponse?.total || leads?.length || 0;
  const totalPages = leadsResponse?.totalPages || 1;

  // Import file mutation
  const importMutation = useMutation(
    async (file: File) => {
      if (!tenantId) throw new Error('No tenant selected');

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/leads/import`, {
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
        queryClient.invalidateQueries(['leads', tenantId]);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
      },
    }
  );

  // Sync API mutation
  const syncMutation = useMutation(
    async (config: typeof syncConfig) => {
      if (!tenantId) throw new Error('No tenant selected');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/leads/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
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
        queryClient.invalidateQueries(['leads', tenantId]);
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
              company: values[4] || '',
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

  const handleSync = () => {
    if (!syncConfig.apiUrl || !syncConfig.apiKey) {
      alert('Please provide API URL and API Key');
      return;
    }
    syncMutation.mutate(syncConfig);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All Lead' },
    { id: 'sync', label: 'Sync Lead' },
    { id: 'import', label: 'Import Lead' },
    { id: 'website', label: 'Lead from Website' },
    { id: 'facebook', label: 'Lead from Facebook' },
    { id: 'namecard', label: 'Import Name Card' },
  ];

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
        <h1 className="text-2xl font-bold text-base">Leads</h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage leads from various sources
          </p>
        </div>
        <div className="flex gap-3">
          {(activeTab === 'import' || activeTab === 'namecard') && (
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-info text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600"
            >
              📥 Import File
            </button>
          )}
          {activeTab === 'sync' && (
            <button
              onClick={() => setShowSyncModal(true)}
              className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
            >
              🔄 Sync from API
            </button>
          )}
          {activeTab === 'all' && (
        <button className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400">
              ➕ Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-border">
          <nav className="flex -mb-px" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1); // Reset to first page when switching tabs
                }}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-secondary-text hover:text-base hover:border-border'
                  }
                `}
              >
                {tab.label}
        </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Leads</div>
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

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Lead Records</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Created At
                </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
              {leads && leads.length > 0 ? (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.firstName || ''} {lead.lastName || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lead.status === 'NEW' ? 'bg-info/20 text-info' :
                        lead.status === 'CONTACTED' ? 'bg-warning/20 text-warning' :
                        lead.status === 'QUALIFIED' ? 'bg-success/20 text-success' :
                        lead.status === 'CONVERTED' ? 'bg-success/20 text-success' :
                        'bg-error/20 text-error'
                      }`}>
                        {lead.status || 'NEW'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {lead.source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    No leads found. {activeTab === 'all' && 'Create a new lead to get started.'}
                    {activeTab === 'import' && 'Import a file to add leads.'}
                    {activeTab === 'sync' && 'Sync from API to add leads.'}
                    {activeTab === 'website' && 'Leads from website newsletter will appear here.'}
                    {activeTab === 'facebook' && 'Leads from Facebook Lead Gen will appear here.'}
                    {activeTab === 'namecard' && 'Import name cards to add leads.'}
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} leads
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
                <h2 className="text-xl font-bold">
                  {activeTab === 'namecard' ? 'Import Name Card' : 'Import Lead Data from File'}
                </h2>
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
                <label className="block text-sm font-medium mb-2">
                  Select File (CSV or Excel) <span className="text-error">*</span>
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
                <p className="text-xs text-secondary-text mt-1">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
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
                          <th className="px-4 py-2 text-left text-xs font-medium">Company</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{row.firstName}</td>
                            <td className="px-4 py-2 text-sm">{row.lastName}</td>
                            <td className="px-4 py-2 text-sm">{row.email}</td>
                            <td className="px-4 py-2 text-sm">{row.phone}</td>
                            <td className="px-4 py-2 text-sm">{row.company}</td>
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
                <h2 className="text-xl font-bold">Sync Lead Data from External API</h2>
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
                    placeholder="https://crm.example.com/api/leads"
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
