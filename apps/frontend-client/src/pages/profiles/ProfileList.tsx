import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { profileApi } from '../../services/api';

export function ProfileList() {
  const queryClient = useQueryClient();

  // State for filters
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    source: '',
    industry: '',
    tagIds: [] as string[],
    segmentIds: [] as string[],
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // State for bulk actions
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch profiles
  const { data: profilesData, isLoading } = useQuery(
    ['profiles', filters],
    () => profileApi.list(filters),
    {
      keepPreviousData: true,
    }
  );

  // Fetch statistics
  const { data: statistics } = useQuery(
    'profile-statistics',
    () => profileApi.getStatistics(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    (profileIds: string[]) => profileApi.bulkDelete(profileIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profiles']);
        queryClient.invalidateQueries(['profile-statistics']);
        setSelectedProfiles(new Set());
        setShowBulkActions(false);
        alert('Profiles deleted successfully');
      },
      onError: (error) => {
        alert(`Failed to delete profiles: ${error}`);
      },
    }
  );

  // Toggle profile selection
  const toggleProfileSelection = (profileId: string) => {
    const newSelected = new Set(selectedProfiles);
    if (newSelected.has(profileId)) {
      newSelected.delete(profileId);
    } else {
      newSelected.add(profileId);
    }
    setSelectedProfiles(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Toggle all profiles
  const toggleAllProfiles = (checked: boolean) => {
    if (checked) {
      const allIds = profilesData?.data?.map((p: any) => p.id) || [];
      setSelectedProfiles(new Set(allIds));
    } else {
      setSelectedProfiles(new Set());
    }
    setShowBulkActions(checked);
  };

  // Handle delete
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedProfiles.size} profile(s)?`)) {
      deleteMutation.mutate(Array.from(selectedProfiles));
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    if (filters.sortBy === sortBy) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setFilters({
        ...filters,
        sortBy,
        sortOrder: 'desc',
      });
    }
  };

  if (isLoading && !profilesData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary-text">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const profiles = profilesData?.data || [];
  const meta = profilesData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-base">Customer Profiles</h1>
          <p className="text-sm text-secondary-text mt-1">
            Unified customer data from all sources
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            🔍 Filters
            {showAdvancedFilters && (
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                {(filters.search || filters.type || filters.status || filters.source || filters.industry) ? 'On' : 'Off'}
              </span>
            )}
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            📥 Import
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            📤 Export
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            🔗 Detect Duplicates
          </button>
          <Link
            to="/profiles/new"
            className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
          >
            + Add Profile
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Total Profiles</div>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Individuals</div>
            <div className="text-2xl font-bold">{statistics.individuals}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Companies</div>
            <div className="text-2xl font-bold">{statistics.companies}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Active</div>
            <div className="text-2xl font-bold text-success">{statistics.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Inactive</div>
            <div className="text-2xl font-bold text-error">{statistics.inactive}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-secondary-text mb-1">Last 30 Days</div>
            <div className="text-2xl font-bold text-primary">{statistics.recentCreated}</div>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Advanced Filters</h2>
            <button
              onClick={() => setFilters({
                search: '',
                type: '',
                status: '',
                source: '',
                industry: '',
                tagIds: [],
                segmentIds: [],
                page: 1,
                limit: 20,
                sortBy: 'createdAt',
                sortOrder: 'desc',
              })}
              className="text-sm text-primary hover:underline"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder="Name, email, phone..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MERGED">Merged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              >
                <option value="">All Sources</option>
                <option value="ERP">ERP</option>
                <option value="LINE">LINE</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="CRM">CRM</option>
                <option value="MANUAL">Manual</option>
                <option value="API">API</option>
                <option value="WEBSITE">Website</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Industry</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder="e.g. Technology, Finance..."
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Items per page</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: 1 })}
              className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-primary/10 border border-primary rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedProfiles.size === profiles.length}
              onChange={(e) => toggleAllProfiles(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              {selectedProfiles.size} of {profiles.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-100">
              🔗 Merge Selected
            </button>
            <button className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-100">
              🏷️ Add Tag
            </button>
            <button className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-100">
              📊 Add to Segment
            </button>
            <button className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-100">
              📤 Export
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isLoading}
              className="text-sm px-3 py-1 bg-error text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Profiles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={selectedProfiles.size === profiles.length}
                  onChange={(e) => toggleAllProfiles(e.target.checked)}
                  className="w-4 h-4"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('name')}
              >
                Name {filters.sortBy === 'name' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('type')}
              >
                Type {filters.sortBy === 'type' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Sources
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('primarySource')}
              >
                Primary Source {filters.sortBy === 'primarySource' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSortChange('createdAt')}
              >
                Created {filters.sortBy === 'createdAt' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-secondary-text">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="text-4xl">👥</div>
                    <div className="text-lg font-medium">No profiles found</div>
                    <div className="text-sm">
                      Import data or create a new profile to get started
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              profiles.map((profile: any) => (
                <tr key={profile.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProfiles.has(profile.id)}
                      onChange={() => toggleProfileSelection(profile.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary font-semibold">
                          {profile.type === 'COMPANY' ? '🏢' : '👤'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-base">{profile.name}</div>
                        <div className="text-sm text-secondary-text">{profile.displayName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profile.type === 'COMPANY'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {profile.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      {profile.email && <div className="text-base">{profile.email}</div>}
                      {profile.phone && <div className="text-secondary-text">{profile.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {profile.identifiers?.slice(0, 3).map((identifier: any) => (
                        <span
                          key={identifier.id}
                          className="px-2 py-1 bg-background rounded text-xs font-medium"
                          title={`${identifier.source}: ${identifier.externalId}`}
                        >
                          {identifier.source}
                        </span>
                      ))}
                      {profile.identifiers?.length > 3 && (
                        <span className="px-2 py-1 bg-background rounded text-xs">
                          +{profile.identifiers.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profile.primarySource === 'ERP' ? 'bg-blue-50 text-blue-600' :
                      profile.primarySource === 'LINE' ? 'bg-green-50 text-green-600' :
                      profile.primarySource === 'FACEBOOK' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {profile.primarySource}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {profile.tagsRelations?.slice(0, 2).map((tagRel: any) => (
                        <span
                          key={tagRel.tag.id}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${tagRel.tag.color}20`,
                            color: tagRel.tag.color,
                          }}
                        >
                          {tagRel.tag.name}
                        </span>
                      ))}
                      {profile.tagsRelations?.length > 2 && (
                        <span className="px-2 py-1 bg-background rounded text-xs">
                          +{profile.tagsRelations.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profile.status === 'ACTIVE'
                        ? 'bg-success/20 text-success'
                        : profile.status === 'INACTIVE'
                        ? 'bg-error/20 text-error'
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {profile.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/profiles/${profile.id}`}
                      className="text-primary hover:text-yellow-500 font-medium text-sm"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="bg-background px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="text-sm text-secondary-text">
              Showing {(meta.page - 1) * meta.limit + 1} to{' '}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} profiles
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(meta.page - 1)}
                disabled={meta.page === 1}
                className="px-3 py-1 border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 border border-border rounded hover:bg-white ${
                      meta.page === pageNum ? 'bg-primary text-white hover:bg-yellow-400' : ''
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {meta.totalPages > 5 && (
                <>
                  <span className="px-2">...</span>
                  <button
                    onClick={() => handlePageChange(meta.totalPages)}
                    className={`px-3 py-1 border border-border rounded hover:bg-white ${
                      meta.page === meta.totalPages ? 'bg-primary text-white hover:bg-yellow-400' : ''
                    }`}
                  >
                    {meta.totalPages}
                  </button>
                </>
              )}
              <button
                onClick={() => handlePageChange(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
                className="px-3 py-1 border border-border rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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
