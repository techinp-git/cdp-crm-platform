import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Automation = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  definition: any;
  updatedAt: string;
};

function extractStats(definition: any): { nodes: number; edges: number } {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes.length : 0;
  const edges = Array.isArray(definition?.edges) ? definition.edges.length : 0;
  return { nodes, edges };
}

export function AutomationListPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryKey = useMemo(() => ['automations', tenantId, q, status, page, limit], [tenantId, q, status, page, limit]);

  const listQuery = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const res = await fetch(`${apiUrl}/messages/automations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load automations');
      return body as { data: Automation[]; total: number; totalPages: number; page: number };
    },
    { enabled: !!tenantId },
  );

  const items: Automation[] = listQuery.data?.data || [];
  const total: number = listQuery.data?.total || 0;
  const totalPages: number = listQuery.data?.totalPages || 1;

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Auto Marketing / Journey</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (listQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (listQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Auto Marketing / Journey</div>
        <div className="text-sm text-error">{(listQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Auto Marketing / Journey</h1>
          <p className="text-sm text-secondary-text mt-1">List ก่อน แล้วค่อยเข้า canvas เพื่อสร้าง flow</p>
        </div>
        <Link to="/messages/automation/new" className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
          + New Journey
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Name or description"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="text-sm text-secondary-text">
            Total: <span className="font-medium text-base">{total}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Journeys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Graph</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length ? (
                items.map((a) => {
                  const st = extractStats(a.definition);
                  return (
                    <tr key={a.id} className="hover:bg-background">
                      <td className="px-6 py-4">
                        <div className="font-medium text-base">{a.name}</div>
                        <div className="text-xs text-secondary-text mt-1">{a.description || '-'}</div>
                        <div className="text-xs text-secondary-text mt-1">Status: {a.status}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-text">
                        {st.nodes} nodes • {st.edges} edges
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-text">{new Date(a.updatedAt).toLocaleString('th-TH')}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/messages/automation/${a.id}`} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-secondary-text">
                    No journeys yet. Click “New Journey”.
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

