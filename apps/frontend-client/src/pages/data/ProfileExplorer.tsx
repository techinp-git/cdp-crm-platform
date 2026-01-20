import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type ProfileRow = {
  id: string;
  type: string;
  profile?: any;
  identifiers?: any;
  createdAt: string;
  updatedAt: string;
};

type ProfilesResp = { data: ProfileRow[]; total: number; page: number; limit: number; totalPages: number };

type DetailResp = {
  customer: ProfileRow & { displayName: string };
  billing: {
    lastBilling: any;
    paidCount: number;
    paidAmount: number;
    lastPaidDate: string | null;
  };
  tracked: {
    trackingStartAt: string | null;
    lastEventAt: string | null;
    lastProductAcquisition: any;
    lastFbAdsAcquisition: any;
  };
  beforeTrack: null | {
    count: number;
    lastBillingBeforeTracking: any;
  };
};

function formatTime(iso?: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return String(iso);
  }
}

function formatTHB(n: any) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v);
}

function safeName(p: ProfileRow) {
  const pr = p.profile || {};
  const ids = p.identifiers || {};
  return pr?.name || pr?.companyName || `${pr?.firstName || ''} ${pr?.lastName || ''}`.trim() || ids?.email || ids?.phone || p.id;
}

export function ProfileExplorerPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [selectedId, setSelectedId] = useState<string>('');

  const listQuery = useQuery(
    ['profiles', tenantId, q, page, limit],
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      const res = await fetch(`${apiUrl}/profiles?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load profiles');
      return body as ProfilesResp;
    },
    { enabled: !!tenantId },
  );

  const rows: ProfileRow[] = listQuery.data?.data || [];
  const totalPages = listQuery.data?.totalPages || 1;

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const detailQuery = useQuery(
    ['profile-detail', tenantId, selectedId],
    async () => {
      const res = await fetch(`${apiUrl}/profiles/${selectedId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load profile detail');
      return body as DetailResp;
    },
    { enabled: !!tenantId && !!selectedId },
  );

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Profile Explorer</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (listQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (listQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Profile Explorer</div>
        <div className="text-sm text-error">{(listQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-semibold">Profiles</div>
          <div className="mt-3">
            <input
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
              placeholder="Search name/email/phone"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
          {rows.length ? (
            rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-background ${selectedId === r.id ? 'bg-background' : ''}`}
              >
                <div className="font-medium">{safeName(r)}</div>
                <div className="text-xs text-secondary-text mt-1 font-mono">{r.id}</div>
              </button>
            ))
          ) : (
            <div className="p-6 text-sm text-secondary-text">No profiles found.</div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-secondary-text">
              Page {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-lg font-semibold mb-2">Profile Detail</div>
          {!selectedId ? (
            <div className="text-sm text-secondary-text">Select a profile from the left.</div>
          ) : detailQuery.isLoading ? (
            <div className="text-sm text-secondary-text">Loading detail...</div>
          ) : detailQuery.isError ? (
            <div className="text-sm text-error">{(detailQuery.error as any)?.message || 'Failed to load detail'}</div>
          ) : (
            (() => {
              const d = detailQuery.data as DetailResp;
              const c = d.customer;
              const ids = c.identifiers || {};
              const pr = c.profile || {};
              const lastBill = d.billing?.lastBilling;
              const lastProdTracked = d.tracked?.lastProductAcquisition;
              const lastFb = d.tracked?.lastFbAdsAcquisition;
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-border rounded-lg p-4">
                      <div className="text-sm text-secondary-text">Name</div>
                      <div className="text-lg font-semibold">{c.displayName}</div>
                      <div className="text-xs text-secondary-text font-mono mt-1">ID: {c.id}</div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <div className="text-sm text-secondary-text">Identifiers</div>
                      <div className="text-sm mt-1">Email: {ids.email || '-'}</div>
                      <div className="text-sm mt-1">Phone: {ids.phone || '-'}</div>
                      <div className="text-sm mt-1">Type: {c.type}</div>
                    </div>
                  </div>

                  {/* Split sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-border rounded-lg p-4">
                      <div className="font-semibold mb-2">Billing (before/without tracking)</div>
                      <div className="text-sm text-secondary-text mb-3">ข้อมูลจาก Billings (ERP/Invoice)</div>

                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-secondary-text">Last Billing</span>
                          <span className="font-medium">{lastBill?.invoiceNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-secondary-text">Issue Date</span>
                          <span>{formatTime(lastBill?.issueDate)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-secondary-text">Paid Date</span>
                          <span>{formatTime(lastBill?.paidDate)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-secondary-text">Amount</span>
                          <span className="font-medium">{formatTHB(lastBill?.amount)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-secondary-text">Status</span>
                          <span>{lastBill?.status || '-'}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-medium mb-2">Paid summary</div>
                        <div className="text-sm text-secondary-text">Paid Count: {d.billing.paidCount}</div>
                        <div className="text-sm text-secondary-text">Paid Amount: {formatTHB(d.billing.paidAmount)}</div>
                        <div className="text-sm text-secondary-text">Last Paid: {formatTime(d.billing.lastPaidDate)}</div>
                      </div>

                      {d.beforeTrack ? (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="text-sm font-medium mb-2">Before tracking started</div>
                          <div className="text-sm text-secondary-text">Invoices before first event: {d.beforeTrack.count}</div>
                          <div className="text-sm text-secondary-text">
                            Last billing before tracking: {d.beforeTrack.lastBillingBeforeTracking?.invoiceNumber || '-'}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-border text-sm text-secondary-text">
                          (ยังไม่มี event tracking สำหรับ profile นี้ เลยยังแยก “ก่อน track” ไม่ได้)
                        </div>
                      )}
                    </div>

                    <div className="border border-border rounded-lg p-4">
                      <div className="font-semibold mb-2">Tracked (events)</div>
                      <div className="text-sm text-secondary-text mb-3">ข้อมูลที่ได้จากการ track (CustomerEvent)</div>

                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-secondary-text">Tracking Start</span>
                          <span>{formatTime(d.tracked.trackingStartAt)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-secondary-text">Last Event</span>
                          <span>{formatTime(d.tracked.lastEventAt)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-medium mb-2">Last product acquisition</div>
                        {lastProdTracked ? (
                          <div className="text-sm">
                            <div className="text-secondary-text">Type: {lastProdTracked.type}</div>
                            <div className="text-secondary-text">Time: {formatTime(lastProdTracked.timestamp)}</div>
                            <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-40 mt-2">
                              {JSON.stringify(lastProdTracked.payload || {}, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-sm text-secondary-text">-</div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-medium mb-2">Last FB Ads acquisition</div>
                        {lastFb ? (
                          <div className="text-sm">
                            <div className="text-secondary-text">Type: {lastFb.type}</div>
                            <div className="text-secondary-text">Time: {formatTime(lastFb.timestamp)}</div>
                            <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-40 mt-2">
                              {JSON.stringify(lastFb.payload || {}, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-sm text-secondary-text">-</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="font-semibold mb-2">Raw profile</div>
                    <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-80">
                      {JSON.stringify({ profile: pr, identifiers: ids }, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

