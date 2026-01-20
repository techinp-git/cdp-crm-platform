import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type AuditLogRow = {
  id: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: { id: string; email?: string; firstName?: string; lastName?: string } | null;
};

type AuditLogResponse = {
  data: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function fmtMs(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `${n} ms`;
}

export function ApiLogPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [method, setMethod] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const { data, isLoading, error } = useQuery(
    ['api-logs', tenantId, q, method, page, limit],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit, totalPages: 1 } as AuditLogResponse;
      const params = new URLSearchParams();
      params.append('entity', 'api_request');
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (q) params.append('q', q);
      if (method) params.append('action', method);

      const res = await fetch(`${apiUrl}/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch API logs');
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const rows = data?.data || [];

  const stats = useMemo(() => {
    const total = rows.length;
    const errors = rows.filter((r) => Number(r?.payload?.statusCode) >= 400).length;
    const avg = total
      ? Math.round(rows.reduce((s, r) => s + (Number(r?.payload?.durationMs) || 0), 0) / total)
      : 0;
    return { total, errors, avg };
  }, [rows]);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">API Log</h1>
          <p className="text-sm text-secondary-text mt-1">Request logs (method/path/status/duration) per tenant</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Shown (current page)</div>
          <div className="text-2xl font-bold text-base">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Errors (≥ 400)</div>
          <div className="text-2xl font-bold text-warning">{stats.errors}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Avg duration</div>
          <div className="text-2xl font-bold text-base">{fmtMs(stats.avg)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search (path/method/entity)</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="/messages/send, /line-events, /settings..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Requests</h2>
          {error ? <div className="text-sm text-warning mt-1">{String((error as any)?.message || error)}</div> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Path</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-secondary-text">
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const status = Number(r?.payload?.statusCode);
                  const statusClass =
                    status >= 500 ? 'text-warning' : status >= 400 ? 'text-warning' : 'text-secondary-text';
                  const actorName =
                    r.actor?.email ||
                    [r.actor?.firstName, r.actor?.lastName].filter(Boolean).join(' ') ||
                    (r.actorUserId ? r.actorUserId.slice(0, 8) : '-');
                  return (
                    <tr key={r.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{r.action}</td>
                      <td className="px-6 py-4 text-sm font-mono text-base max-w-xl truncate">{r.entityId || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${statusClass}`}>
                        {Number.isFinite(status) ? status : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-secondary-text">
                        {fmtMs(r?.payload?.durationMs)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{actorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelected(r)}
                          className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary-text">
                    No logs yet. Use the app and refresh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-secondary-text">
              Page {data.page} of {data.totalPages} — Total {data.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page === 1}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page === data.totalPages}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">API Log Detail</h2>
                <div className="text-sm text-secondary-text mt-1">
                  {selected.action} <span className="font-mono">{selected.entityId}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-secondary-text">Time</div>
                  <div className="font-medium">{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-secondary-text">Status / Duration</div>
                  <div className="font-medium">
                    {selected?.payload?.statusCode ?? '-'} / {fmtMs(selected?.payload?.durationMs)}
                  </div>
                </div>
                <div>
                  <div className="text-secondary-text">IP</div>
                  <div className="font-mono">{selected.ipAddress || '-'}</div>
                </div>
                <div>
                  <div className="text-secondary-text">User Agent</div>
                  <div className="font-mono text-xs break-all">{selected.userAgent || '-'}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-2">Payload</div>
                <pre className="text-xs bg-background border border-border rounded-md p-4 overflow-x-auto">
                  {JSON.stringify(selected.payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

