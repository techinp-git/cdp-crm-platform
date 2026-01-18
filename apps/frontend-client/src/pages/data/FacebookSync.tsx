import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export function FacebookSync() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [syncConfig, setSyncConfig] = useState({
    apiUrl: '',
    apiKey: '',
    pageId: '',
    accessToken: '',
    syncFrequency: 'manual',
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedConversation, setSelectedConversation] = useState<string>('');

  // Get tenant ID from TenantContext
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Get Facebook Messenger messages list with pagination
  const { data: facebookDataResponse, isLoading } = useQuery(
    ['facebook-sync', tenantId, currentPage, limit, selectedConversation],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (selectedConversation) {
        params.append('conversationId', selectedConversation);
      }

      const response = await fetch(
        `${apiUrl}/facebook-sync?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': tenantId,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch Facebook Messenger data');
      }
      return response.json();
    },
    {
      enabled: !!tenantId,
    }
  );

  const facebookData = facebookDataResponse?.data || [];
  const total = facebookDataResponse?.total || 0;
  const totalPages = facebookDataResponse?.totalPages || 1;

  // Get unique conversations for filter
  const uniqueConversations = Array.from(new Set(facebookData.map((item: any) => item.conversationId).filter(Boolean)));

  // Import file mutation
  const importMutation = useMutation(
    async (file: File) => {
      if (!tenantId) throw new Error('No tenant selected');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/facebook-sync/import`, {
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
        queryClient.invalidateQueries(['facebook-sync', tenantId]);
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

      const response = await fetch(`${apiUrl}/facebook-sync/sync`, {
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
        queryClient.invalidateQueries(['facebook-sync', tenantId]);
        setShowSyncModal(false);
        setSyncConfig({ apiUrl: '', apiKey: '', pageId: '', accessToken: '', syncFrequency: 'manual' });
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
        const lines = text.split('\n').slice(0, 6); // First 5 rows for preview
        const preview = lines
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return {
              conversationId: values[0] || '',
              postId: values[1] || '',
              senderName: values[2] || '',
              messageText: values[3] || '',
              timestamp: values[4] || '',
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
    // Create sample CSV content for Messenger data
    const sampleCSV = `pageId,pageName,conversationId,messageId,postId,senderId,senderName,messageText,messageType,timestamp
1234567890123456,My Business Page,conv_001,msg_001,,user_001,สมชาย ใจดี,สวัสดีครับ สนใจสินค้า,text,2024-01-15T10:30:00Z
1234567890123456,My Business Page,conv_001,msg_002,,page_1234567890123456,My Business Page,สวัสดีครับ ยินดีให้บริการครับ,text,2024-01-15T10:31:00Z
1234567890123456,My Business Page,conv_002,msg_003,post_123456789012345,user_002,สมหญิง รักงาน,สนใจสินค้าจากโพสต์,text,2024-01-16T14:20:00Z
1234567890123456,My Business Page,conv_002,msg_004,,page_1234567890123456,My Business Page,มีโปรโมชั่นพิเศษวันนี้ครับ,text,2024-01-16T14:21:00Z
1234567890123456,My Business Page,conv_003,msg_005,,user_003,วิชัย มั่งคั่ง,ส่งของเมื่อไหร่,text,2024-01-17T09:15:00Z`;

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'facebook_messenger_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSync = () => {
    if (!syncConfig.pageId || !syncConfig.accessToken) {
      alert('Please provide Page ID and Access Token');
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
          <h1 className="text-2xl font-bold text-base">Facebook Sync</h1>
          <p className="text-sm text-secondary-text mt-1">
            Sync Facebook Messenger conversations and messages from API or import from file
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
          <div className="text-sm text-secondary-text mb-1">Total Messages</div>
          <div className="text-2xl font-bold text-base">{total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Conversations</div>
          <div className="text-2xl font-bold text-base">{uniqueConversations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Last Import</div>
          <div className="text-sm text-base">-</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Sync Status</div>
          <div className="text-sm text-success">Active</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="block text-sm font-medium">Filter by Conversation:</label>
          <select
            className="flex-1 px-3 py-2 border border-border rounded-md"
            value={selectedConversation}
            onChange={(e) => {
              setSelectedConversation(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Conversations</option>
            {uniqueConversations.map((convId) => (
              <option key={convId} value={convId}>
                {convId}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedConversation('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border rounded-md hover:bg-background"
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* Messenger Messages Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Messenger Messages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Conversation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Post ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {facebookData && facebookData.length > 0 ? (
                facebookData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">
                      {item.conversationId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {item.postId ? (
                        <div>
                          <div className="font-medium text-base">{item.postId.substring(0, 20)}...</div>
                          <div className="text-xs text-info mt-1">From Post Ads</div>
                        </div>
                      ) : (
                        <span className="text-secondary-text">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium">{item.senderName || '-'}</div>
                        {item.senderId && (
                          <div className="text-xs text-secondary-text">{item.senderId.substring(0, 15)}...</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-base max-w-md">
                      <div className="truncate">{item.messageText || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.messageType === 'image' ? 'bg-info/20 text-info' :
                        item.messageType === 'attachment' ? 'bg-primary/20 text-primary' :
                        'bg-background text-secondary-text'
                      }`}>
                        {item.messageType || 'text'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No Messenger messages found. Import a file or sync from API to get started.
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} messages
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
                <h2 className="text-xl font-bold">Import Messenger Data from File</h2>
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
                    <li><code className="bg-white px-1 rounded">pageId</code> - Facebook Page ID</li>
                    <li><code className="bg-white px-1 rounded">pageName</code> - Facebook Page Name (optional)</li>
                    <li><code className="bg-white px-1 rounded">conversationId</code> - Conversation ID</li>
                    <li><code className="bg-white px-1 rounded">messageId</code> - Message ID</li>
                    <li><code className="bg-white px-1 rounded">postId</code> - Post ID (optional - if message came from Post Ads click)</li>
                    <li><code className="bg-white px-1 rounded">senderId</code> - Sender User ID (optional)</li>
                    <li><code className="bg-white px-1 rounded">senderName</code> - Sender Name (optional)</li>
                    <li><code className="bg-white px-1 rounded">messageText</code> - Message content</li>
                    <li><code className="bg-white px-1 rounded">messageType</code> - Message type (text, image, attachment)</li>
                    <li><code className="bg-white px-1 rounded">timestamp</code> - Message timestamp (ISO format)</li>
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
                          <th className="px-4 py-2 text-left text-xs font-medium">Conversation</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Post ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Sender</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Message</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{row.conversationId}</td>
                            <td className="px-4 py-2 text-sm">{row.postId || '-'}</td>
                            <td className="px-4 py-2 text-sm">{row.senderName}</td>
                            <td className="px-4 py-2 text-sm">{row.messageText}</td>
                            <td className="px-4 py-2 text-sm">{row.timestamp}</td>
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
                <h2 className="text-xl font-bold">Sync Messenger Data from API</h2>
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
                    Facebook Page ID <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="1234567890123456"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.pageId}
                    onChange={(e) => setSyncConfig({ ...syncConfig, pageId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Access Token <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Facebook Access Token"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.accessToken}
                    onChange={(e) => setSyncConfig({ ...syncConfig, accessToken: e.target.value })}
                  />
                  <p className="text-xs text-secondary-text mt-1">
                    Get your access token from Facebook Graph API Explorer (requires pages_messaging permission)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">API URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://graph.facebook.com/v18.0/{page-id}/conversations"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={syncConfig.apiUrl}
                    onChange={(e) => setSyncConfig({ ...syncConfig, apiUrl: e.target.value })}
                  />
                  <p className="text-xs text-secondary-text mt-1">
                    Leave empty to use default Facebook Messenger Conversations API endpoint
                  </p>
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
                  disabled={!syncConfig.pageId || !syncConfig.accessToken || syncMutation.isLoading}
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
