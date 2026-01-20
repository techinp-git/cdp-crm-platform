import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Broadcast = {
  id: string;
  immediateId?: string | null;
  campaignId?: string | null;
  channel: string;
  templateKind?: string | null;
  templateId?: string | null;
  name?: string | null;
  stats?: any;
  metadata?: any;
  createdAt: string;
};

type Delivery = {
  id: string;
  destination: string;
  status: string;
  errorMessage?: string | null;
  providerMeta?: any;
  createdAt: string;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function DeliveryReportPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryLimit] = useState(50);

  const historyKey = useMemo(() => ['report-broadcasts', tenantId, q, channel, page, limit], [tenantId, q, channel, page, limit]);
  const historyQuery = useQuery(
    historyKey,
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (channel) params.set('channel', channel);
      const res = await fetch(`${apiUrl}/messages/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load broadcasts');
      return body as { data: Broadcast[]; total: number; totalPages: number };
    },
    { enabled: !!tenantId },
  );

  const items = historyQuery.data?.data || [];
  const total = historyQuery.data?.total || 0;
  const totalPages = historyQuery.data?.totalPages || 1;

  const statsKey = useMemo(() => ['delivery-stats', tenantId, selected?.id], [tenantId, selected?.id]);
  const statsQuery = useQuery(
    statsKey,
    async () => {
      if (!selected?.id) return null;
      const params = new URLSearchParams({ broadcastId: selected.id });
      const res = await fetch(`${apiUrl}/messages/deliveries/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load delivery stats');
      return body as { broadcastId: string; total: number; byStatus: Record<string, number> };
    },
    { enabled: !!tenantId && !!selected?.id },
  );

  const deliveriesKey = useMemo(
    () => ['report-deliveries', tenantId, selected?.id, deliveryStatus, deliveryPage, deliveryLimit],
    [tenantId, selected?.id, deliveryStatus, deliveryPage, deliveryLimit],
  );
  const deliveriesQuery = useQuery(
    deliveriesKey,
    async () => {
      if (!selected?.id) return null;
      const params = new URLSearchParams({ broadcastId: selected.id, page: String(deliveryPage), limit: String(deliveryLimit) });
      if (deliveryStatus) params.set('status', deliveryStatus);
      const res = await fetch(`${apiUrl}/messages/deliveries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load deliveries');
      return body as { data: Delivery[]; total: number; totalPages: number; page: number };
    },
    { enabled: !!tenantId && !!selected?.id },
  );

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Delivery Report</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (historyQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (historyQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Delivery Report</div>
        <div className="text-sm text-error">{(historyQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  const byStatus = statsQuery.data?.byStatus || {};
  const queued = n(byStatus.QUEUED);
  const sent = n(byStatus.SENT);
  const failed = n(byStatus.FAILED);
  const totalDeliveries = statsQuery.data?.total ?? 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Delivery Report</h1>
          <p className="text-sm text-secondary-text mt-1">เลือก broadcast แล้วดู delivery KPI + รายการส่ง</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search broadcast</label>
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
          <div className="text-sm text-secondary-text">
            Total: <span className="font-medium text-base">{total}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Select Broadcast</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Sent At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Channel</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {items.length ? (
                  items.map((b) => (
                    <tr key={b.id} className="hover:bg-background">
                      <td className="px-6 py-4 text-sm text-secondary-text">{new Date(b.createdAt).toLocaleString('th-TH')}</td>
                      <td className="px-6 py-4 text-sm font-medium text-base">
                        <div>{b.name || '-'}</div>
                        <div className="text-xs text-secondary-text mt-1 font-mono">ID: {b.id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{b.channel}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <button
                          className="px-3 py-2 border border-border rounded-md hover:bg-background"
                          onClick={() => {
                            setSelected(b);
                            setDeliveryStatus('');
                            setDeliveryPage(1);
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-secondary-text">
                      No broadcasts.
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-border flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Report</h2>
              <div className="text-sm text-secondary-text mt-1">
                {selected ? (
                  <>
                    {selected.name || '-'} • {selected.channel} • {new Date(selected.createdAt).toLocaleString('th-TH')}
                  </>
                ) : (
                  'Select a broadcast first'
                )}
              </div>
              {selected ? <div className="text-xs text-secondary-text font-mono mt-1">Broadcast ID: {selected.id}</div> : null}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Delivery status</label>
              <select
                className="px-3 py-2 border border-border rounded-md text-sm"
                value={deliveryStatus}
                disabled={!selected}
                onChange={(e) => {
                  setDeliveryStatus(e.target.value);
                  setDeliveryPage(1);
                }}
              >
                <option value="">All</option>
                <option value="QUEUED">QUEUED</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {selected ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="border border-border rounded-lg p-4 bg-background">
                    <div className="text-xs text-secondary-text">Total</div>
                    <div className="text-2xl font-bold text-base">{totalDeliveries}</div>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-background">
                    <div className="text-xs text-secondary-text">Queued</div>
                    <div className="text-2xl font-bold text-base">{queued}</div>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-background">
                    <div className="text-xs text-secondary-text">Sent</div>
                    <div className="text-2xl font-bold text-base">{sent}</div>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-background">
                    <div className="text-xs text-secondary-text">Failed</div>
                    <div className="text-2xl font-bold text-error">{failed}</div>
                  </div>
                </div>

                {statsQuery.isError ? (
                  <div className="p-3 bg-error/10 text-error rounded-md text-sm mb-4">
                    {(statsQuery.error as any)?.message || 'Failed to load stats'}
                  </div>
                ) : null}

                <div className="border border-border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Destination</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border">
                      {deliveriesQuery.isLoading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-secondary-text">
                            Loading deliveries...
                          </td>
                        </tr>
                      ) : deliveriesQuery.isError ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-error">
                            {(deliveriesQuery.error as any)?.message || 'Failed to load deliveries'}
                          </td>
                        </tr>
                      ) : (deliveriesQuery.data?.data || []).length ? (
                        (deliveriesQuery.data?.data || []).map((d) => (
                          <tr key={d.id}>
                            <td className="px-4 py-2 text-xs text-secondary-text">{new Date(d.createdAt).toLocaleString('th-TH')}</td>
                            <td className="px-4 py-2 text-xs font-mono">{d.destination}</td>
                            <td className="px-4 py-2 text-xs">
                              <span className={d.status === 'FAILED' ? 'text-error' : d.status === 'SENT' ? 'text-success' : 'text-secondary-text'}>
                                {d.status}
                              </span>
                              {d.errorMessage ? <div className="text-xs text-error mt-1">{d.errorMessage}</div> : null}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-secondary-text">
                            No deliveries.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {(deliveriesQuery.data?.totalPages || 1) > 1 ? (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-secondary-text">
                      Page {deliveryPage} / {deliveriesQuery.data?.totalPages || 1}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeliveryPage((p) => Math.max(1, p - 1))}
                        disabled={deliveryPage === 1}
                        className="px-3 py-2 border border-border rounded-md text-sm hover:bg-background disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setDeliveryPage((p) => Math.min(deliveriesQuery.data?.totalPages || 1, p + 1))}
                        disabled={deliveryPage === (deliveriesQuery.data?.totalPages || 1)}
                        className="px-3 py-2 border border-border rounded-md text-sm hover:bg-background disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-secondary-text">Please select a broadcast to view delivery report.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

