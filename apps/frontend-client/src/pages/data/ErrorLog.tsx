import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type AuditLogRow = {
  id: string;
  tenantId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: any;
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

type ErrorRow = {
  id: string;
  source: 'API' | 'IMPORT';
  time: string;
  title: string;
  statusCode?: number | null;
  durationMs?: number | null;
  message?: string | null;
  raw: AuditLogRow;
};

function fmtMs(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `${n} ms`;
}

function includesInsensitive(hay: any, needle: string) {
  const h = String(hay || '').toLowerCase();
  const n = String(needle || '').trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

export function ErrorLogPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [source, setSource] = useState<'ALL' | 'API' | 'IMPORT'>('ALL');
  const [severity, setSeverity] = useState<'ALL' | '4XX' | '5XX'>('ALL');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ErrorRow | null>(null);

  // We fetch latest 200 from each source, then filter/merge client-side.
  const { data: apiLogs, isLoading: apiLoading } = useQuery(
    ['error-logs-api', tenantId],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } as AuditLogResponse;
      const params = new URLSearchParams();
      params.append('entity', 'api_request');
      params.append('page', '1');
      params.append('limit', '200');
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

  const { data: importLogs, isLoading: importLoading } = useQuery(
    ['error-logs-import', tenantId],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } as AuditLogResponse;
      const params = new URLSearchParams();
      params.append('entity', 'import_job');
      params.append('action', 'IMPORT');
      params.append('page', '1');
      params.append('limit', '200');
      const res = await fetch(`${apiUrl}/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch Import logs');
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const rows = useMemo(() => {
    const out: ErrorRow[] = [];

    // API errors: statusCode >= 400 OR has errorMessage
    for (const r of apiLogs?.data || []) {
      const status = Number(r?.payload?.statusCode);
      const msg = r?.payload?.errorMessage;
      if ((Number.isFinite(status) && status >= 400) || msg) {
        out.push({
          id: r.id,
          source: 'API',
          time: r.createdAt,
          title: `${String(r.action || '').toUpperCase()} ${r.entityId || r?.payload?.path || '-'}`,
          statusCode: Number.isFinite(status) ? status : null,
          durationMs: Number.isFinite(Number(r?.payload?.durationMs)) ? Number(r.payload.durationMs) : null,
          message: msg || null,
          raw: r,
        });
      }
    }

    // Import errors: payload.errorMessage OR result.failed > 0 OR result.errors non-empty
    for (const r of importLogs?.data || []) {
      const p = r?.payload || {};
      const msg = p?.errorMessage;
      const failedCount = Number(p?.result?.failed) || 0;
      const errorsArr = Array.isArray(p?.result?.errors) ? p.result.errors : [];
      if (msg || failedCount > 0 || errorsArr.length > 0) {
        const fileName = p?.fileName ? ` (${p.fileName})` : '';
        out.push({
          id: r.id,
          source: 'IMPORT',
          time: r.createdAt,
          title: `${p?.module || r.entityId || 'import'}${fileName}`,
          statusCode: null,
          durationMs: Number.isFinite(Number(p?.durationMs)) ? Number(p.durationMs) : null,
          message: msg || (errorsArr.length ? String(errorsArr[0]) : failedCount ? `failed: ${failedCount}` : null),
          raw: r,
        });
      }
    }

    // Filters
    const filtered = out.filter((x) => {
      if (source !== 'ALL' && x.source !== source) return false;
      if (severity !== 'ALL') {
        const sc = x.statusCode || 0;
        if (severity === '4XX' && !(sc >= 400 && sc < 500)) return false;
        if (severity === '5XX' && !(sc >= 500)) return false;
        // For IMPORT rows, severity filter doesn't apply unless ALL
        if (x.source === 'IMPORT') return false;
      }
      if (q) {
        const blob = `${x.title} ${x.message || ''} ${x.raw?.entityId || ''} ${JSON.stringify(x.raw?.payload || {})}`;
        if (!includesInsensitive(blob, q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return filtered;
  }, [apiLogs?.data, importLogs?.data, q, severity, source]);

  const isLoading = apiLoading || importLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base">Error Log</h1>
        <p className="text-sm text-secondary-text mt-1">
          Combined errors from API requests (status ≥ 400) and import jobs (failed/errors)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
            >
              <option value="ALL">All</option>
              <option value="API">API</option>
              <option value="IMPORT">Import</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Severity (API only)</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              disabled={source === 'IMPORT'}
            >
              <option value="ALL">All</option>
              <option value="4XX">4xx</option>
              <option value="5XX">5xx</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="path/module/message..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Errors ({rows.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Message</th>
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
                  const sc = r.statusCode;
                  const scText = sc != null ? String(sc) : '-';
                  const scClass = sc != null && sc >= 500 ? 'text-warning' : sc != null && sc >= 400 ? 'text-warning' : 'text-secondary-text';
                  return (
                    <tr key={r.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {new Date(r.time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{r.source}</td>
                      <td className="px-6 py-4 text-sm font-mono text-base max-w-xl truncate">{r.title}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${scClass}`}>{scText}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-secondary-text">
                        {fmtMs(r.durationMs)}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-text max-w-md truncate">{r.message || '-'}</td>
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
                    No errors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">Error Detail</h2>
                <div className="text-sm text-secondary-text mt-1">{selected.title}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selected.message ? (
                <div className="p-4 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
                  {selected.message}
                </div>
              ) : null}
              <pre className="text-xs bg-background border border-border rounded-md p-4 overflow-x-auto">
                {JSON.stringify(selected.raw, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

