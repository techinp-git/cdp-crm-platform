import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  channel: string;
  schedule?: any;
  scheduleAt?: string | null;
  lastRunAt?: string | null;
  runsCount?: number;
  updatedAt: string;
};

function scheduleSummary(c: Campaign): string {
  const s = c.schedule;
  if (s && typeof s === 'object') {
    const cadence = String(s.cadence || '').toUpperCase();
    const time = String(s.time || '');
    const startDate = String(s.startDate || '');
    const always = s.always === undefined ? true : Boolean(s.always);
    const endDate = s.endDate ? String(s.endDate) : '';
    if (!cadence || !time || !startDate) return '-';
    const cadenceLabel = cadence === 'ONCE' ? 'Once' : cadence === 'DAILY' ? 'Daily' : cadence === 'WEEKLY' ? 'Weekly' : 'Monthly';
    const range = always ? `${startDate} → Always` : `${startDate} → ${endDate || '-'}`;
    return `${cadenceLabel} ${time} • ${range}`;
  }
  if (c.scheduleAt) return new Date(c.scheduleAt).toLocaleString('th-TH');
  return '-';
}

export function CampaignListPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryKey = useMemo(() => ['campaigns', tenantId, q, channel, status, page, limit], [tenantId, q, channel, status, page, limit]);

  const { data, isLoading, isError, error } = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (channel) params.set('channel', channel);
      if (status) params.set('status', status);
      const res = await fetch(`${apiUrl}/messages/campaigns?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load campaigns');
      return body;
    },
    { enabled: !!tenantId },
  );

  const items: Campaign[] = data?.data || [];
  const totalPages: number = data?.totalPages || 1;
  const total: number = data?.total || 0;

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Campaign (Scheduled)</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (isLoading) return <div className="text-center py-12">Loading...</div>;
  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Campaign (Scheduled)</div>
        <div className="text-sm text-error">{error instanceof Error ? error.message : 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Campaign (Scheduled)</h1>
          <p className="text-sm text-secondary-text mt-1">Create campaigns and run now (scheduler can be added later)</p>
        </div>
        <Link to="/messages/campaign/new" className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
          + New Campaign
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
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
          <h2 className="text-lg font-semibold">Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Runs</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length ? (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-base">{c.name}</div>
                      <div className="text-xs text-secondary-text mt-1">{c.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{c.channel}</td>
                    <td className="px-6 py-4 text-sm">{c.status}</td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {scheduleSummary(c)}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {Number(c.runsCount || 0)} {c.lastRunAt ? `• last: ${new Date(c.lastRunAt).toLocaleString('th-TH')}` : ''}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Link to={`/messages/campaign/${c.id}`} className="px-3 py-2 border border-border rounded-md hover:bg-background">
                          Open
                        </Link>
                        <Link to={`/messages/campaign/${c.id}?tab=history`} className="px-3 py-2 border border-border rounded-md hover:bg-background">
                          History
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-text">
                    No campaigns yet. Click “New Campaign”.
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

