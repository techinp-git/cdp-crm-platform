import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Broadcast = {
  id: string;
  tenantId: string;
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

function statsSummary(stats: any) {
  const s = stats || {};
  const total = s.total ?? '-';
  const queued = s.queued ?? '-';
  const sent = s.sent ?? '-';
  const failed = s.failed ?? '-';
  return { total, queued, sent, failed };
}

export function MessageHistoryPage() {
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

  const listKey = useMemo(() => ['message-history', tenantId, q, channel, page, limit], [tenantId, q, channel, page, limit]);
  const historyQuery = useQuery(
    listKey,
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (channel) params.set('channel', channel);
      const res = await fetch(`${apiUrl}/messages/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load message history');
      return body as { data: Broadcast[]; total: number; page: number; limit: number; totalPages: number };
    },
    { enabled: !!tenantId },
  );

  const total = historyQuery.data?.total || 0;
  const totalPages = historyQuery.data?.totalPages || 1;
  const items: Broadcast[] = historyQuery.data?.data || [];

  const deliveriesKey = useMemo(
    () => ['message-deliveries', tenantId, selected?.id, deliveryStatus, deliveryPage, deliveryLimit],
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
      return body as { data: Delivery[]; total: number; page: number; totalPages: number };
    },
    { enabled: !!tenantId && !!selected?.id },
  );

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Message History</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (historyQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (historyQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Message History</div>
        <div className="text-sm text-error">{(historyQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Message History</h1>
          <p className="text-sm text-secondary-text mt-1">All broadcasts (from Immediate/Campaign)</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
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
          <div className="text-sm text-secondary-text">
            Total: <span className="font-medium text-base">{total}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Broadcasts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Sent At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Stats</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length ? (
                items.map((b) => {
                  const st = statsSummary(b.stats);
                  const templateText = b.templateKind === 'RAW' ? 'RAW' : `${b.templateKind || '-'}${b.templateId ? ` • ${b.templateId}` : ''}`;
                  return (
                    <tr key={b.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{new Date(b.createdAt).toLocaleString('th-TH')}</td>
                      <td className="px-6 py-4 text-sm font-medium text-base">
                        <div>{b.name || '-'}</div>
                        <div className="text-xs text-secondary-text mt-1">
                          {b.campaignId ? `Campaign: ${b.campaignId.slice(-6)}` : b.immediateId ? `Immediate: ${b.immediateId.slice(-6)}` : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{b.channel}</td>
                      <td className="px-6 py-4 text-sm text-secondary-text">{templateText}</td>
                      <td className="px-6 py-4 text-sm text-secondary-text">
                        total <b className="text-base">{st.total}</b> • queued <b className="text-base">{st.queued}</b> • sent{' '}
                        <b className="text-base">{st.sent}</b> • failed <b className="text-error">{st.failed}</b>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          className="px-3 py-2 border border-border rounded-md hover:bg-background"
                          onClick={() => {
                            setSelected(b);
                            setDeliveryStatus('');
                            setDeliveryPage(1);
                          }}
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
                    No broadcasts yet.
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

      {selected ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow max-w-5xl w-full p-6">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <div className="text-lg font-semibold">Broadcast Detail</div>
                <div className="text-sm text-secondary-text mt-1">
                  {selected.name || '-'} • {selected.channel} • {new Date(selected.createdAt).toLocaleString('th-TH')}
                </div>
                <div className="text-xs text-secondary-text font-mono mt-1">ID: {selected.id}</div>
              </div>
              <button className="text-secondary-text hover:text-base" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-border rounded-lg p-4">
                <div className="text-sm font-semibold mb-2">Summary</div>
                {(() => {
                  const st = statsSummary(selected.stats);
                  return (
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-secondary-text">Source</span>
                        <span className="font-medium text-base">
                          {selected.campaignId ? `Campaign (${selected.campaignId.slice(-6)})` : selected.immediateId ? `Immediate (${selected.immediateId.slice(-6)})` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-text">Template</span>
                        <span className="font-medium text-base">
                          {selected.templateKind === 'RAW' ? 'RAW' : `${selected.templateKind || '-'}${selected.templateId ? ` • ${selected.templateId}` : ''}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-text">Stats</span>
                        <span className="font-medium text-base">
                          total {st.total} • queued {st.queued} • sent {st.sent} • failed {st.failed}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 text-sm font-semibold">Metadata</div>
                <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-56 mt-2">
                  {JSON.stringify(selected.metadata || {}, null, 2)}
                </pre>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold">Deliveries</div>
                  <select
                    className="px-3 py-2 border border-border rounded-md text-sm"
                    value={deliveryStatus}
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

                {deliveriesQuery.isLoading ? (
                  <div className="text-sm text-secondary-text">Loading deliveries...</div>
                ) : deliveriesQuery.isError ? (
                  <div className="text-sm text-error">{(deliveriesQuery.error as any)?.message || 'Failed to load deliveries'}</div>
                ) : (
                  <>
                    <div className="border border-border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Destination</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-border">
                          {(deliveriesQuery.data?.data || []).length ? (
                            (deliveriesQuery.data?.data || []).map((d) => (
                              <tr key={d.id}>
                                <td className="px-3 py-2 text-xs text-secondary-text">{new Date(d.createdAt).toLocaleString('th-TH')}</td>
                                <td className="px-3 py-2 text-xs font-mono">{d.destination}</td>
                                <td className="px-3 py-2 text-xs">
                                  <span className={d.status === 'FAILED' ? 'text-error' : d.status === 'SENT' ? 'text-success' : 'text-secondary-text'}>
                                    {d.status}
                                  </span>
                                  {d.errorMessage ? <div className="text-xs text-error mt-1">{d.errorMessage}</div> : null}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-3 py-8 text-center text-sm text-secondary-text">
                                No deliveries.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {(deliveriesQuery.data?.totalPages || 1) > 1 ? (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-secondary-text">
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
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

