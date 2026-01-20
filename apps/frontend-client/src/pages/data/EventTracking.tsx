import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type EventRow = {
  id: string;
  customerId: string;
  type: string;
  timestamp: string;
  payload?: any;
  customer?: {
    id: string;
    type: string;
    profile?: any;
    identifiers?: any;
  };
};

type EventsResp = {
  data: EventRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type TypeRow = { type: string; count: number };

function safeName(customer?: EventRow['customer']): string {
  const p = customer?.profile || {};
  const ids = customer?.identifiers || {};
  return p?.name || p?.companyName || `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || ids?.email || ids?.phone || customer?.id || '-';
}

function formatTime(iso?: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
}

export function EventTrackingPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [range, setRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('7D');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selected, setSelected] = useState<EventRow | null>(null);

  const { from, to } = useMemo(() => {
    if (range === 'ALL') return { from: '', to: '' };
    const now = new Date();
    const start = new Date(now);
    if (range === '24H') start.setHours(now.getHours() - 24);
    if (range === '7D') start.setDate(now.getDate() - 7);
    if (range === '30D') start.setDate(now.getDate() - 30);
    return { from: start.toISOString(), to: now.toISOString() };
  }, [range]);

  const typesQuery = useQuery(
    ['event-types', tenantId, from, to],
    async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '50');
      const res = await fetch(`${apiUrl}/events/types?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load event types');
      return (Array.isArray(body) ? body : []) as TypeRow[];
    },
    { enabled: !!tenantId },
  );

  const eventsQuery = useQuery(
    ['events', tenantId, q, type, from, to, page, limit],
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`${apiUrl}/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load events');
      return body as EventsResp;
    },
    { enabled: !!tenantId },
  );

  const rows: EventRow[] = eventsQuery.data?.data || [];
  const total = eventsQuery.data?.total || 0;
  const totalPages = eventsQuery.data?.totalPages || 1;

  const topType = typesQuery.data?.[0]?.type || '-';
  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.customerId);
    return set.size;
  }, [rows]);

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Event Tracking</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (eventsQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (eventsQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Event Tracking</div>
        <div className="text-sm text-error">{(eventsQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Event Tracking</h1>
          <p className="text-sm text-secondary-text mt-1">Browse customer events (page_view, purchase, email_opened, ...)</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Total Events</div>
          <div className="text-2xl font-bold text-base">{total.toLocaleString()}</div>
          <div className="text-xs text-secondary-text mt-2">Range: {range}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Unique Customers (in page)</div>
          <div className="text-2xl font-bold text-base">{uniqueCustomers.toLocaleString()}</div>
          <div className="text-xs text-secondary-text mt-2">This is page-level (not global) for now</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-secondary-text mb-1">Top Event Type</div>
          <div className="text-2xl font-bold text-base">{topType}</div>
          <div className="text-xs text-secondary-text mt-2">
            {typesQuery.isLoading ? 'Loading...' : typesQuery.isError ? 'Failed to load' : 'Based on selected range'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="event type or customerId"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {(typesQuery.data || []).map((t) => (
                <option key={t.type} value={t.type}>
                  {t.type} ({t.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Range</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="24H">24H</option>
              <option value="7D">7D</option>
              <option value="30D">30D</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="text-lg font-semibold">Events</div>
            <div className="text-sm text-secondary-text">
              Page {page} / {totalPages}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Customer</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {rows.length ? (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-background cursor-pointer ${selected?.id === r.id ? 'bg-background' : ''}`}
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-4 py-3 text-sm text-secondary-text">{formatTime(r.timestamp)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-base">{r.type}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{safeName(r.customer)}</div>
                        <div className="text-xs text-secondary-text font-mono">{r.customerId}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-secondary-text">
                      No events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-secondary-text">
                Total: {total.toLocaleString()}
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

        {/* Detail */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-lg font-semibold mb-2">Event Detail</div>
          {!selected ? (
            <div className="text-sm text-secondary-text">Select an event from the list.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-secondary-text">Type:</span> <span className="font-medium text-base">{selected.type}</span>
              </div>
              <div className="text-sm">
                <span className="text-secondary-text">Time:</span> <span>{formatTime(selected.timestamp)}</span>
              </div>
              <div className="text-sm">
                <span className="text-secondary-text">Customer:</span>{' '}
                <div className="mt-1 border border-border rounded-md p-3 bg-background">
                  <div className="font-medium">{safeName(selected.customer)}</div>
                  <div className="text-xs text-secondary-text font-mono">{selected.customerId}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Payload</div>
                <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-80">
                  {JSON.stringify(selected.payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

