import { useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

interface LineFollower {
  id: string;
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  status: string;
  isUnblocked: boolean;
  followedAt: string;
  unfollowedAt?: string;
  createdAt: string;
  customer?: {
    id: string;
    identifiers: any;
    profile: any;
  };
}

export function LineAddFriend() {
  const { activeTenant } = useTenant();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Get tenant ID from TenantContext (reactive to tenant changes)
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Get LINE followers list with pagination (include tenantId in query key for reactivity)
  const { data: followersResponse, isLoading } = useQuery(
    ['line-followers', tenantId, currentPage, limit, selectedStatus, search],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      if (selectedStatus) params.append('status', selectedStatus);
      if (search) params.append('search', search);

      const response = await fetch(
        `${apiUrl}/line-followers?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'x-tenant-id': tenantId,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch LINE followers');
      }
      return response.json();
    },
    {
      enabled: !!tenantId, // Only fetch when tenantId is available
    }
  );

  // Get stats (include tenantId in query key for reactivity)
  const { data: statsResponse } = useQuery(
    ['line-followers-stats', tenantId],
    async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }
      const response = await fetch(
        `${apiUrl}/line-followers/stats`,
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

  const followers = followersResponse?.data || [];
  const total = followersResponse?.total || 0;
  const totalPages = followersResponse?.totalPages || 1;
  const stats = statsResponse || { total: 0, followCount: 0, unfollowCount: 0, todayCount: 0 };

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
          <h1 className="text-2xl font-bold text-base">LINE OA Add Friend</h1>
          <p className="text-sm text-secondary-text mt-1">
            Manage and track LINE Official Account followers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Followers</div>
          <div className="text-2xl font-bold text-base">{stats.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Active (Follow)</div>
          <div className="text-2xl font-bold text-success">{stats.followCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Unfollowed</div>
          <div className="text-2xl font-bold text-error">{stats.unfollowCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Today's New</div>
          <div className="text-2xl font-bold text-primary">{stats.todayCount || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or User ID..."
              className="w-full px-3 py-2 border border-border rounded-md"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset to first page
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1); // Reset to first page
              }}
            >
              <option value="">All Status</option>
              <option value="FOLLOW">Follow</option>
              <option value="UNFOLLOW">Unfollow</option>
            </select>
          </div>
        </div>
      </div>

      {/* Followers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Followers List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Followed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Unfollowed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                  Customer
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {followers && followers.length > 0 ? (
                followers.map((follower: LineFollower) => (
                  <tr key={follower.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {follower.pictureUrl && (
                          <img
                            src={follower.pictureUrl}
                            alt={follower.displayName || follower.userId}
                            className="h-10 w-10 rounded-full mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-base">
                            {follower.displayName || 'Unknown User'}
                          </div>
                          {follower.isUnblocked && (
                            <span className="text-xs text-warning">Unblocked</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {follower.userId.substring(0, 20)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        follower.status === 'FOLLOW' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-error/20 text-error'
                      }`}>
                        {follower.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {follower.followedAt ? new Date(follower.followedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {follower.unfollowedAt ? new Date(follower.unfollowedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {follower.customer ? (
                        <span className="text-primary">Linked</span>
                      ) : (
                        <span className="text-secondary-text">Not linked</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No followers found. Follow events from LINE webhook will appear here.
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
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} followers
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
