import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Immediate = {
  id: string;
  name: string;
  status: string;
  channel: string;
  updatedAt: string;
  createdAt: string;
  historyCount?: number;
  lastSentAt?: string | null;
};

export function ImmediateListPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryKey = useMemo(() => ['immediates', tenantId, q, channel, status, page, limit], [tenantId, q, channel, status, page, limit]);

  const { data, isLoading, isError, error } = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (channel) params.set('channel', channel);
      if (status) params.set('status', status);
      const res = await fetch(`${apiUrl}/messages/immediates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load immediates');
      return body;
    },
    { enabled: !!tenantId },
  );

  const items: Immediate[] = data?.data || [];
  const totalPages: number = data?.totalPages || 1;
  const total: number = data?.total || 0;

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Send Message (Immediate)</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (isLoading) return <div className="text-center py-12">Loading...</div>;
  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Send Message (Immediate)</div>
        <div className="text-sm text-error">{error instanceof Error ? error.message : 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Send Message (Immediate)</h1>
          <p className="text-sm text-secondary-text mt-1">Drafts you can send multiple times (history kept)</p>
        </div>
        <Link to="/messages/send/new" className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
          + Add Immediate
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Name"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="LINE">LINE</option>
              <option value="MESSENGER">MESSENGER</option>
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-secondary-text">
              Total: <span className="font-medium text-base">{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Immediate List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">History</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Last Sent</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length ? (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">{i.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{i.channel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{i.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{i.historyCount ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                      {i.lastSentAt ? new Date(i.lastSentAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Link to={`/messages/send/${i.id}`} className="px-3 py-1 border border-border rounded hover:bg-background">
                          Open
                        </Link>
                        <Link to={`/messages/send/${i.id}?tab=history`} className="px-3 py-1 border border-border rounded hover:bg-background">
                          History
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No immediates yet. Click “Add Immediate”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-secondary-text">
              Page {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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

