import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

interface CsatsResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CsatsItem {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  project?: string;
  score: number;
  comment?: string;
  feedbackCategory?: string;
  surveyDate: string;
  source?: string;
  channel?: string;
  createdAt: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export function CsatsData() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    minScore: '',
    maxScore: '',
    channel: '',
    feedbackCategory: '',
    project: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Get tenant ID from TenantContext
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Get CSAT data with pagination and filters
  const { data: csatsResponse, isLoading } = useQuery(
    ['csat-data', tenantId, currentPage, limit, filters, searchQuery],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minScore) params.append('minScore', filters.minScore);
      if (filters.maxScore) params.append('maxScore', filters.maxScore);
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.feedbackCategory) params.append('feedbackCategory', filters.feedbackCategory);
      if (filters.project) params.append('project', filters.project);

      const response = await fetch(`${apiUrl}/csat-data?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSAT data');
      }

      return response.json();
    },
    {
      enabled: !!tenantId,
    }
  );

  const csatsData = csatsResponse?.data || [];
  const total = csatsResponse?.total || 0;
  const totalPages = csatsResponse?.totalPages || 1;

  // Calculate statistics
  const averageScore = csatsData.length > 0
    ? (csatsData.reduce((sum: number, item: CsatsItem) => sum + item.score, 0) / csatsData.length).toFixed(2)
    : '0.00';

  const scoreDistribution = csatsData.reduce((acc: Record<number, number>, item: CsatsItem) => {
    acc[item.score] = (acc[item.score] || 0) + 1;
    return acc;
  }, {});

  // Import file mutation
  const importMutation = useMutation(
    async (file: File) => {
      if (!tenantId) throw new Error('No tenant selected');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/csat-data/import`, {
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
      onSuccess: (result: ImportResult) => {
        queryClient.invalidateQueries(['csat-data', tenantId]);
        setShowImportModal(false);
        alert(`Import successful: ${result.success} records imported, ${result.failed} failed`);
      },
      onError: (error: Error) => {
        alert(`Import failed: ${error.message}`);
      },
    }
  );

  // Sync from API mutation
  const syncMutation = useMutation(
    async (config: any) => {
      if (!tenantId) throw new Error('No tenant selected');

      const response = await fetch(`${apiUrl}/csat-data/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
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
      onSuccess: (result: ImportResult) => {
        queryClient.invalidateQueries(['csat-data', tenantId]);
        setShowSyncModal(false);
        alert(`Sync successful: ${result.success} records synced, ${result.failed} failed`);
      },
      onError: (error: Error) => {
        alert(`Sync failed: ${error.message}`);
      },
    }
  );

  // Export data
  const exportData = async () => {
    if (!tenantId) return;

    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.minScore) params.append('minScore', filters.minScore);
    if (filters.maxScore) params.append('maxScore', filters.maxScore);
    if (filters.channel) params.append('channel', filters.channel);
    if (filters.feedbackCategory) params.append('feedbackCategory', filters.feedbackCategory);
    if (filters.project) params.append('project', filters.project);
    if (searchQuery) params.append('search', searchQuery);

    const response = await fetch(`${apiUrl}/csat-data/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'x-tenant-id': tenantId,
      },
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `csat-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      // Preview CSV content
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(0, 6); // Show first 5 lines
        setImportPreview(lines);
      };
      reader.readAsText(file);
    }
  };

  // Handle import
  const handleImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };

  // Handle sync
  const handleSync = () => {
    syncMutation.mutate({});
  };

  // Get unique channels and categories for filters
  const uniqueChannels = Array.from(new Set(csatsData.map((item: CsatsItem) => item.channel).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(csatsData.map((item: CsatsItem) => item.feedbackCategory).filter(Boolean)));
  const uniqueProjects = Array.from(new Set(csatsData.map((item: CsatsItem) => item.project).filter(Boolean)));

  const { data: projectSummary } = useQuery(
    ['csat-project-summary', tenantId, filters, searchQuery],
    async () => {
      if (!tenantId) return { projects: [] };
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minScore) params.append('minScore', filters.minScore);
      if (filters.maxScore) params.append('maxScore', filters.maxScore);
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.feedbackCategory) params.append('feedbackCategory', filters.feedbackCategory);
      if (filters.project) params.append('project', filters.project);
      const response = await fetch(`${apiUrl}/csat-data/projects?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch CSAT project summary');
      return response.json();
    },
    { enabled: !!tenantId },
  );

  const { data: customerProject, isLoading: customerProjectLoading } = useQuery(
    ['csat-customer-project', tenantId, currentPage, limit, filters, searchQuery],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.minScore) params.append('minScore', filters.minScore);
      if (filters.maxScore) params.append('maxScore', filters.maxScore);
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.feedbackCategory) params.append('feedbackCategory', filters.feedbackCategory);
      if (filters.project) params.append('project', filters.project);
      const response = await fetch(`${apiUrl}/csat-data/customer-project?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch CSAT customer-project');
      return response.json();
    },
    { enabled: !!tenantId },
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">CSAT Data Source</h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage Customer Satisfaction Survey data from various sources
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportData}
            className="border border-border px-4 py-2 rounded-md font-medium hover:bg-background"
          >
            📥 Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-info text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600"
          >
            📤 Import CSV
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
          <div className="text-sm text-secondary-text mb-1">Average Score</div>
          <div className="text-3xl font-bold text-base">{averageScore}</div>
          <div className="text-sm text-secondary-text mt-1">out of 5.0</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Responses</div>
          <div className="text-3xl font-bold text-base">{total}</div>
          <div className="text-sm text-secondary-text mt-1">All time</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Channels</div>
          <div className="text-2xl font-bold text-base">{uniqueChannels.length}</div>
          <div className="text-sm text-secondary-text mt-1">Active sources</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Update</div>
          <div className="text-sm text-base font-medium">
            {csatsData.length > 0
              ? new Date(csatsData[0].createdAt).toLocaleDateString()
              : '-'}
          </div>
        </div>
      </div>

      {/* Project Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Project Summary</h3>
          <div className="text-sm text-secondary-text">CSAT per project</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Project</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Customers</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Responses</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Avg Score</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Last</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {(projectSummary?.projects || []).length ? (
                projectSummary.projects.map((p: any) => (
                  <tr key={p.project}>
                    <td className="px-4 py-2 text-sm font-medium">{p.project}</td>
                    <td className="px-4 py-2 text-sm text-right text-secondary-text">{p.customers}</td>
                    <td className="px-4 py-2 text-sm text-right text-secondary-text">{p.responses}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">{p.avgScore}</td>
                    <td className="px-4 py-2 text-sm text-right text-secondary-text">
                      {p.lastSubmittedAt ? new Date(p.lastSubmittedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-secondary-text">
                    No projects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((score) => {
            const count = scoreDistribution[score] || 0;
            const percentage = csatsData.length > 0 ? (count / csatsData.length) * 100 : 0;
            return (
              <div key={score} className="flex items-center">
                <div className="w-12 text-sm font-medium">{score} ★</div>
                <div className="flex-1 mx-4 bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-right">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Customer name, email, comment..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters({ ...filters, dateFrom: e.target.value });
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters({ ...filters, dateTo: e.target.value });
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Score Range */}
          <div>
            <label className="block text-sm font-medium mb-1">Min Score</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.minScore}
              onChange={(e) => {
                setFilters({ ...filters, minScore: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5].map(score => (
                <option key={`min-${score}`} value={score}>{score}+</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Score</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.maxScore}
              onChange={(e) => {
                setFilters({ ...filters, maxScore: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5].map(score => (
                <option key={`max-${score}`} value={score}>{score}-</option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.channel}
              onChange={(e) => {
                setFilters({ ...filters, channel: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All Channels</option>
              {uniqueChannels.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </div>

          {/* Feedback Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Feedback Category</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.feedbackCategory}
              onChange={(e) => {
                setFilters({ ...filters, feedbackCategory: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={filters.project}
              onChange={(e) => {
                setFilters({ ...filters, project: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              setFilters({
                dateFrom: '',
                dateTo: '',
                minScore: '',
                maxScore: '',
                channel: '',
                feedbackCategory: '',
                project: '',
              });
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border rounded-md hover:bg-background"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Customer score by project */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Customer Scores by Project</h2>
          <div className="text-sm text-secondary-text mt-1">Grouped by customer + project</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Responses</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Avg</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Last</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {customerProjectLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-secondary-text">
                    Loading...
                  </td>
                </tr>
              ) : (customerProject?.data || []).length ? (
                customerProject.data.map((row: any, idx: number) => (
                  <tr key={`${row.project}-${row.customerKey}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{row.project}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-base">{row.customerName || row.customerEmail || row.customerPhone || row.customerKey}</div>
                      {row.customerEmail ? <div className="text-sm text-secondary-text">{row.customerEmail}</div> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-secondary-text">{row.responses}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{row.avgScore}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-secondary-text">
                      {row.lastSubmittedAt ? new Date(row.lastSubmittedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary-text">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSAT Responses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            CSAT Responses ({total})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Survey Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {csatsData.map((item: CsatsItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {item.project || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-base">
                      {item.customerName || item.customerId}
                    </div>
                    {item.customerEmail && (
                      <div className="text-sm text-secondary-text">{item.customerEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      item.score >= 4 ? 'bg-green-100 text-green-800' :
                      item.score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {'★'.repeat(item.score)}{'☆'.repeat(5 - item.score)} ({item.score})
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-base max-w-xs truncate">
                      {item.comment || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {item.feedbackCategory || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {item.channel || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {new Date(item.surveyDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {csatsData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    No CSAT responses found
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-border rounded-md disabled:opacity-50 hover:bg-background"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-border rounded-md disabled:opacity-50 hover:bg-background"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Import CSAT Data</h2>
              <p className="text-sm text-secondary-text mt-1">
                Upload a CSV file with CSAT survey responses
              </p>
            </div>
            <div className="p-6">
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
              </div>

              {/* CSV Format Instructions */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-2">Expected CSV Format:</h3>
                <div className="text-sm text-secondary-text">
                  <code className="block mb-2">
                    customerId,customerName,customerEmail,score,comment,feedbackCategory,surveyDate,channel
                  </code>
                  <code className="block mb-2">
                    CUST001,John Doe,john@example.com,5,Great service!,Product Support,2024-01-15,Email
                  </code>
                </div>
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Preview:</h3>
                  <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs">
                      {importPreview.join('\n')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
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
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
              >
                {importMutation.isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Sync CSAT Data from API</h2>
              <p className="text-sm text-secondary-text mt-1">
                Fetch CSAT survey responses from connected API
              </p>
            </div>
            <div className="p-6">
              <div className="bg-info bg-opacity-10 border border-info rounded-lg p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-info text-xl">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-info">
                      This will sync CSAT data from your configured API endpoint. The process may take a few minutes depending on the amount of data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">API Endpoint</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="https://your-api.com/csat"
                    disabled
                    value={import.meta.env.VITE_CSAT_API_URL || 'Not configured'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sync Frequency</label>
                  <select className="w-full px-3 py-2 border border-border rounded-md">
                    <option value="once">One-time sync</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={syncMutation.isLoading}
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
              >
                {syncMutation.isLoading ? 'Syncing...' : 'Start Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
