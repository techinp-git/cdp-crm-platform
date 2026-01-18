import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { customerApi } from '../../services/api';

export function CustomerList() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    segment: '',
    tag: '',
    dateRange: '',
  });
  const { data: customers, isLoading } = useQuery('customers', () => customerApi.list());

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-base">Unified Customer Profiles</h1>
        <div className="flex gap-3">
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            📥 Import
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            📤 Export
          </button>
          <button className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400">
            + Add Customer
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Advanced Filters</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-primary font-medium"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        {showFilters && (
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
              <label className="block text-sm font-medium mb-2">Segment</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.segment}
                onChange={(e) => setFilters({ ...filters, segment: e.target.value })}
              >
                <option value="">All Segments</option>
                <option value="vip">VIP Customers</option>
                <option value="active">Active Customers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              >
                <option value="">All Time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400">
            Apply Filters
          </button>
          <button
            onClick={() => setFilters({ search: '', type: '', segment: '', tag: '', dateRange: '' })}
            className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input type="checkbox" className="w-4 h-4" />
          <span className="text-sm text-secondary-text">Select all</span>
          <span className="text-sm text-secondary-text">0 selected</span>
        </div>
        <div className="flex gap-2">
          <button className="text-sm px-3 py-1 bg-background rounded hover:bg-gray-100">
            Add to Segment
          </button>
          <button className="text-sm px-3 py-1 bg-background rounded hover:bg-gray-100">
            Add Tag
          </button>
          <button className="text-sm px-3 py-1 bg-background rounded hover:bg-gray-100">
            Export Selected
          </button>
          <button className="text-sm px-3 py-1 bg-error text-white rounded hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                <input type="checkbox" className="w-4 h-4" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {customers?.map((customer: any) => (
              <tr key={customer.id} className="hover:bg-background">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {customer.profile?.firstName} {customer.profile?.lastName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.identifiers?.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-background rounded text-sm">
                    {customer.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {customer.tags?.slice(0, 2).map((tag: any) => (
                      <span
                        key={tag.tag.id}
                        className="px-2 py-1 bg-primary/20 text-primary rounded text-xs"
                      >
                        {tag.tag.name}
                      </span>
                    ))}
                    {customer.tags?.length > 2 && (
                      <span className="px-2 py-1 bg-background rounded text-xs">
                        +{customer.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/cdp/customers/${customer.id}`}
                    className="text-primary hover:text-yellow-500 font-medium"
                  >
                    View 360°
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

