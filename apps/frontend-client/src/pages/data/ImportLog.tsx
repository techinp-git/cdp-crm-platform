import { useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type ImportLogRow = {
  id: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: any;
  createdAt: string;
  actor?: { id: string; email?: string; firstName?: string; lastName?: string } | null;
  tenant?: { id: string; name?: string; slug?: string } | null;
};

type ImportLogResponse = {
  data: ImportLogRow[];
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

function isFailed(r: ImportLogRow) {
  return !!r?.payload?.errorMessage;
}

export function ImportLogPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selected, setSelected] = useState<ImportLogRow | null>(null);

  const { data, isLoading, error } = useQuery(
    ['import-logs', tenantId, q, status, page, limit],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit, totalPages: 1 } as ImportLogResponse;
      const params = new URLSearchParams();
      params.append('entity', 'import_job');
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (q) params.append('q', q);
      // action for imports is "IMPORT"
      params.append('action', 'IMPORT');

      const res = await fetch(`${apiUrl}/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch import logs');
      const json = (await res.json()) as ImportLogResponse;

      if (status === 'ALL') return json;
      const filtered = json.data.filter((r) => (status === 'FAILED' ? isFailed(r) : !isFailed(r)));
      return { ...json, data: filtered };
    },
    { enabled: !!tenantId },
  );

  const rows = data?.data || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base">Import Log</h1>
        <p className="text-sm text-secondary-text mt-1">Track CSV/Excel imports (success/fail, duration, details)</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="ALL">All</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="module/path/fileName..."
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
          <h2 className="text-lg font-semibold">Imports</h2>
          {error ? <div className="text-sm text-warning mt-1">{String((error as any)?.message || error)}</div> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">File</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-secondary-text">
                    Loading...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => {
                  const failed = isFailed(r);
                  const moduleName = r?.payload?.module || r.entityId || '-';
                  const fileName = r?.payload?.fileName || '-';
                  const result = r?.payload?.result;
                  const successCount = result?.success ?? result?.processed ?? result?.imported;
                  const failedCount = result?.failed ?? result?.errors?.length;
                  return (
                    <tr key={r.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{String(moduleName)}</td>
                      <td className="px-6 py-4 text-sm font-mono text-base max-w-xl truncate">{String(fileName)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {failed ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning">FAILED</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">SUCCESS</span>
                        )}
                        <div className="text-xs text-secondary-text mt-1">
                          {successCount != null ? `ok:${successCount}` : ''}
                          {failedCount != null ? ` fail:${failedCount}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-secondary-text">
                        {fmtMs(r?.payload?.durationMs)}
                      </td>
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
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No import logs yet. Run an import (Quotation/Billing/CSAT) and refresh.
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
                <h2 className="text-xl font-semibold">Import Log Detail</h2>
                <div className="text-sm text-secondary-text mt-1">
                  {selected.payload?.module || selected.entityId || '-'} — {new Date(selected.createdAt).toLocaleString()}
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
              {selected.payload?.errorMessage ? (
                <div className="p-4 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
                  {String(selected.payload.errorMessage)}
                </div>
              ) : null}
              <pre className="text-xs bg-background border border-border rounded-md p-4 overflow-x-auto">
                {JSON.stringify(selected.payload || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

