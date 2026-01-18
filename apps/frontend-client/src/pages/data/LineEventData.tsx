import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

interface LineEvent {
  id: string;
  eventType: string;
  sourceType?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
  timestamp: string;
  mode?: string;
  replyToken?: string;
  messageType?: string;
  messageText?: string;
  messageId?: string;
  postbackData?: string;
  postbackParams?: any;
  beaconHwid?: string;
  beaconType?: string;
  accountLinkResult?: string;
  rawPayload?: any;
  status: string;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export function LineEventData() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Get tenant ID from TenantContext (reactive to tenant changes)
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const webhookUrl = `${apiUrl}/line-events/webhook/${tenantId}`;

  // Get LINE events list with pagination (include tenantId in query key for reactivity)
  const { data: eventsResponse, isLoading } = useQuery(
    ['line-events', tenantId, currentPage, limit, selectedEventType, selectedStatus],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (selectedEventType) params.append('eventType', selectedEventType);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(
        `${apiUrl}/line-events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': tenantId,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch LINE events');
      }
      return response.json();
    },
    {
      enabled: !!tenantId, // Only fetch when tenantId is available
    }
  );

  // Get stats (include tenantId in query key for reactivity)
  const { data: statsResponse } = useQuery(
    ['line-events-stats', tenantId],
            async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }
      const response = await fetch(
        `${apiUrl}/line-events/stats?period=today`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': tenantId,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
    {
      enabled: !!tenantId, // Only fetch when tenantId is available
    }
  );

  const events = eventsResponse?.data || [];
  const total = eventsResponse?.total || 0;
  const totalPages = eventsResponse?.totalPages || 1;
  const stats = statsResponse || { total: 0, uniqueUsers: 0, byType: [], byStatus: [] };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL copied to clipboard!');
  };

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      message: 'bg-info/20 text-info',
      follow: 'bg-success/20 text-success',
      unfollow: 'bg-warning/20 text-warning',
      join: 'bg-primary/20 text-primary',
      leave: 'bg-secondary-text/20 text-secondary-text',
      postback: 'bg-info/20 text-info',
      beacon: 'bg-primary/20 text-primary',
      accountLink: 'bg-success/20 text-success',
    };
    return colors[type] || 'bg-background text-base';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      RECEIVED: 'bg-info/20 text-info',
      PROCESSED: 'bg-success/20 text-success',
      FAILED: 'bg-error/20 text-error',
    };
    return colors[status] || 'bg-background text-base';
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
          <h1 className="text-2xl font-bold text-base">LINE OA Event</h1>
          <p className="text-sm text-secondary-text mt-1">
            Webhook events from LINE Messaging API
          </p>
        </div>
      </div>

      {/* Webhook URL Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Webhook URL</h2>
            <p className="text-sm text-secondary-text mb-3">
              Configure this URL in LINE Developers Console → Messaging API → Webhook URL
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-2 bg-background border border-border rounded-md text-sm break-all">
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhookUrl}
                className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 whitespace-nowrap"
              >
                📋 Copy URL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Events (Today)</div>
          <div className="text-2xl font-bold text-base">{stats.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Unique Users</div>
          <div className="text-2xl font-bold text-base">{stats.uniqueUsers || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">By Type</div>
          <div className="text-sm text-base">
            {stats.byType?.map((item: any) => (
              <div key={item.eventType} className="mb-1">
                {item.eventType}: {item.count}
              </div>
            )) || '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">By Status</div>
          <div className="text-sm text-base">
            {stats.byStatus?.map((item: any) => (
              <div key={item.status} className="mb-1">
                {item.status}: {item.count}
              </div>
            )) || '-'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-md"
            >
              <option value="">All Types</option>
              <option value="message">Message</option>
              <option value="follow">Follow</option>
              <option value="unfollow">Unfollow</option>
              <option value="join">Join</option>
              <option value="leave">Leave</option>
              <option value="postback">Postback</option>
              <option value="beacon">Beacon</option>
              <option value="accountLink">Account Link</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-md"
            >
              <option value="">All Status</option>
              <option value="RECEIVED">Received</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedEventType('');
                setSelectedStatus('');
                setCurrentPage(1);
                queryClient.invalidateQueries(['line-events']);
              }}
              className="w-full px-4 py-2 border border-border rounded-md hover:bg-background"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Event Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {events && events.length > 0 ? (
                events.map((event: LineEvent) => (
                  <tr key={event.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                        {event.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {event.sourceType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-text">
                      {event.userId ? event.userId.substring(0, 20) + '...' : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-text max-w-xs truncate">
                      {event.messageText || event.postbackData || event.beaconType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No LINE events found. Configure webhook URL in LINE Developers Console to receive events.
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} events
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
    </div>
  );
}
