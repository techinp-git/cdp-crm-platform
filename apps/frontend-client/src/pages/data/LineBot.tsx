import { useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

interface LineEvent {
  id: string;
  eventType: string;
  sourceType?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
  timestamp: string;
  messageType?: string;
  messageText?: string;
  messageId?: string;
  status: string;
  createdAt: string;
}

interface GroupConversation {
  groupId: string;
  groupName?: string;
  lastMessageAt: string;
  messageCount: number;
  memberCount?: number;
  events: LineEvent[];
}

export function LineBot() {
  const { activeTenant } = useTenant();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'groups' | 'timeline'>('groups');

  // Get tenant ID from TenantContext (reactive to tenant changes)
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Get LINE events for Group Bot (filter by groupId or roomId is not null)
  const { data: eventsResponse, isLoading } = useQuery(
    ['line-bot-events', tenantId, currentPage, limit, selectedGroupId, selectedEventType],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      
      // Filter for group/room events only (not 1-on-1)
      params.append('groupOnly', '1');
      if (selectedGroupId) params.append('groupOrRoomId', selectedGroupId);
      if (selectedEventType) {
        params.append('eventType', selectedEventType);
      }

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
        throw new Error('Failed to fetch LINE Bot events');
      }
      return response.json();
    },
    {
      enabled: !!tenantId,
    }
  );

  const events = eventsResponse?.data || [];
  const total = eventsResponse?.total || 0;
  const totalPages = eventsResponse?.totalPages || 1;

  // Filter events to only show group/room events (not 1-on-1)
  const groupRoomEvents = events.filter((event: LineEvent) => 
    event.groupId || event.roomId
  );

  // If specific group selected, filter by it
  const filteredEvents = selectedGroupId 
    ? groupRoomEvents.filter((e: LineEvent) => e.groupId === selectedGroupId || e.roomId === selectedGroupId)
    : groupRoomEvents;

  // Group events by groupId/roomId for group view
  const groupConversations: GroupConversation[] = filteredEvents.reduce((acc: any[], event: LineEvent) => {
    const groupKey = event.groupId || event.roomId || 'unknown';
    const existing = acc.find(g => g.groupId === groupKey);
    
    if (existing) {
      existing.events.push(event);
      existing.messageCount++;
      if (new Date(event.timestamp) > new Date(existing.lastMessageAt)) {
        existing.lastMessageAt = event.timestamp;
      }
    } else {
      acc.push({
        groupId: groupKey,
        groupName: `Group ${groupKey.substring(0, 8)}...`,
        lastMessageAt: event.timestamp,
        messageCount: 1,
        events: [event],
      });
    }
    return acc;
  }, []);

  // Sort groups by last message time
  groupConversations.sort((a, b) => 
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Get unique group IDs for filter dropdown
  const uniqueGroupIds: string[] = Array.from(
    new Set(groupRoomEvents.map((e: LineEvent) => String(e.groupId || e.roomId || '').trim()).filter(Boolean))
  );

  // Get stats
  const stats = {
    totalGroups: uniqueGroupIds.length,
    totalMessages: groupRoomEvents.filter(e => e.eventType === 'message').length,
    todayMessages: groupRoomEvents.filter(e => {
      const eventDate = new Date(e.timestamp);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString() && e.eventType === 'message';
    }).length,
    activeGroups: groupConversations.length,
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
          <h1 className="text-2xl font-bold text-base">LINE OA Bot/Group Bot</h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage group conversations and bot interactions in LINE Groups
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('groups')}
            className={`px-4 py-2 rounded-md font-medium ${
              viewMode === 'groups'
                ? 'bg-primary text-base'
                : 'bg-background text-secondary-text hover:bg-border'
            }`}
          >
            📁 Groups
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-md font-medium ${
              viewMode === 'timeline'
                ? 'bg-primary text-base'
                : 'bg-background text-secondary-text hover:bg-border'
            }`}
          >
            📜 Timeline
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Groups</div>
          <div className="text-2xl font-bold text-base">{stats.totalGroups}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Messages</div>
          <div className="text-2xl font-bold text-base">{stats.totalMessages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Today's Messages</div>
          <div className="text-2xl font-bold text-primary">{stats.todayMessages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Active Groups</div>
          <div className="text-2xl font-bold text-success">{stats.activeGroups}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Group/Room</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Groups</option>
              {uniqueGroupIds.map((groupId) => (
                <option key={groupId} value={groupId}>
                  {groupId.substring(0, 20)}...
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Event Type</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Events</option>
              <option value="message">Message</option>
              <option value="join">Join</option>
              <option value="leave">Leave</option>
              <option value="postback">Postback</option>
            </select>
          </div>
        </div>
      </div>

      {/* Groups View */}
      {viewMode === 'groups' && (
        <div className="space-y-4">
          {groupConversations.length > 0 ? (
            groupConversations.map((group) => (
              <div key={group.groupId} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{group.groupName}</h3>
                      <p className="text-sm text-secondary-text mt-1">
                        Group ID: {group.groupId.substring(0, 30)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-secondary-text">
                        {group.messageCount} messages
                      </div>
                      <div className="text-xs text-secondary-text mt-1">
                        Last: {new Date(group.lastMessageAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {group.events.slice(0, 10).map((event: LineEvent) => (
                      <div key={event.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-base">
                              {event.userId ? `User ${event.userId.substring(0, 8)}...` : 'Bot'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              event.eventType === 'message' ? 'bg-info/20 text-info' :
                              event.eventType === 'join' ? 'bg-success/20 text-success' :
                              event.eventType === 'leave' ? 'bg-warning/20 text-warning' :
                              'bg-background text-secondary-text'
                            }`}>
                              {event.eventType}
                            </span>
                            <span className="text-xs text-secondary-text">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {event.messageText && (
                            <div className="text-sm text-base mt-1">
                              {event.messageText}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {group.events.length > 10 && (
                    <div className="mt-3 text-center text-sm text-secondary-text">
                      Showing 10 of {group.events.length} messages. Click to view all.
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-secondary-text">
              <p>No group conversations found.</p>
              <p className="text-sm mt-2">Group events from LINE webhook will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">All Group Events Timeline</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Group/Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {filteredEvents && filteredEvents.length > 0 ? (
                  filteredEvents.map((event: LineEvent) => (
                    <tr key={event.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(event.groupId || event.roomId || '').substring(0, 20)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {event.userId ? event.userId.substring(0, 15) + '...' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          event.eventType === 'message' ? 'bg-info/20 text-info' :
                          event.eventType === 'join' ? 'bg-success/20 text-success' :
                          event.eventType === 'leave' ? 'bg-warning/20 text-warning' :
                          event.eventType === 'postback' ? 'bg-primary/20 text-primary' :
                          'bg-background text-secondary-text'
                        }`}>
                          {event.eventType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-base max-w-md truncate">
                        {event.messageText || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-secondary-text">
                      No group events found. Group events from LINE webhook will appear here.
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
      )}
    </div>
  );
}
