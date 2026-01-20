import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Channel = 'LINE' | 'FACEBOOK' | 'MESSENGER' | 'IG';

type ChannelAccount = {
  id: string;
  channel: Channel | string;
  name: string;
  status: 'ACTIVE' | 'DISABLED' | string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

const channelOptions: Array<{ key: Channel; label: string; hint: string }> = [
  { key: 'LINE', label: 'LINE OA', hint: 'LINE Messaging API (multiple OA)' },
  { key: 'FACEBOOK', label: 'Facebook Page', hint: 'Facebook Page for posting / inbox' },
  { key: 'MESSENGER', label: 'Messenger', hint: 'Messenger inbox (via Facebook)' },
  { key: 'IG', label: 'Instagram', hint: 'IG inbox (via Meta)' },
];

function maskToken(s?: string) {
  const v = String(s || '').trim();
  if (!v) return '';
  if (v.length <= 10) return '••••••••';
  return `${v.slice(0, 6)}••••••••${v.slice(-4)}`;
}

function metaStr(meta: any, key: string) {
  const v = meta?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function ChannelSetup() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [activeChannel, setActiveChannel] = useState<Channel>('LINE');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChannelAccount | null>(null);

  const [form, setForm] = useState<{
    channel: Channel;
    name: string;
    status: 'ACTIVE' | 'DISABLED';
    // LINE
    lineChannelId: string;
    lineChannelSecret: string;
    lineChannelAccessToken: string;
    // Facebook/Meta
    fbPageId: string;
    fbPageName: string;
    fbAccessToken: string;
  }>({
    channel: 'LINE',
    name: '',
    status: 'ACTIVE',
    lineChannelId: '',
    lineChannelSecret: '',
    lineChannelAccessToken: '',
    fbPageId: '',
    fbPageName: '',
    fbAccessToken: '',
  });

  const webhookUrl = useMemo(() => {
    if (!tenantId) return '';
    return `${apiUrl}/line-events/webhook/${tenantId}`;
  }, [apiUrl, tenantId]);

  const { data: accounts, isLoading } = useQuery(
    ['channel-accounts', tenantId],
    async () => {
      if (!tenantId) return [] as ChannelAccount[];
      const response = await fetch(`${apiUrl}/chat-center/channel-accounts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch channel accounts');
      return response.json();
    },
    { enabled: !!tenantId },
  );

  const byChannel = useMemo(() => {
    const map: Record<string, ChannelAccount[]> = {};
    for (const a of accounts || []) {
      const key = String(a.channel || '').toUpperCase();
      map[key] = map[key] || [];
      map[key].push(a);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [accounts]);

  const openCreate = (channel: Channel) => {
    setEditing(null);
    setForm({
      channel,
      name: '',
      status: 'ACTIVE',
      lineChannelId: '',
      lineChannelSecret: '',
      lineChannelAccessToken: '',
      fbPageId: '',
      fbPageName: '',
      fbAccessToken: '',
    });
    setShowModal(true);
  };

  const openEdit = (acc: ChannelAccount) => {
    const ch = String(acc.channel || '').toUpperCase() as Channel;
    setEditing(acc);
    setForm({
      channel: ch,
      name: acc.name || '',
      status: (String(acc.status || 'ACTIVE').toUpperCase() as any) === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
      lineChannelId: metaStr(acc.metadata, 'channelId'),
      lineChannelSecret: metaStr(acc.metadata, 'channelSecret'),
      lineChannelAccessToken: metaStr(acc.metadata, 'channelAccessToken'),
      fbPageId: metaStr(acc.metadata, 'pageId'),
      fbPageName: metaStr(acc.metadata, 'pageName'),
      fbAccessToken: metaStr(acc.metadata, 'accessToken'),
    });
    setShowModal(true);
  };

  const createMutation = useMutation(
    async () => {
      if (!tenantId) throw new Error('No tenant selected');
      const metadata =
        form.channel === 'LINE'
          ? {
              channelId: form.lineChannelId,
              channelSecret: form.lineChannelSecret,
              channelAccessToken: form.lineChannelAccessToken,
              webhookUrl,
            }
          : {
              pageId: form.fbPageId,
              pageName: form.fbPageName,
              accessToken: form.fbAccessToken,
            };

      const response = await fetch(`${apiUrl}/chat-center/channel-accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: form.channel,
          name: form.name,
          status: form.status,
          metadata,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Create failed');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['channel-accounts', tenantId]);
        setShowModal(false);
      },
      onError: (e: any) => alert(e?.message || 'Create failed'),
    },
  );

  const updateMutation = useMutation(
    async () => {
      if (!tenantId) throw new Error('No tenant selected');
      if (!editing) throw new Error('No editing record');

      const metadata =
        form.channel === 'LINE'
          ? {
              channelId: form.lineChannelId,
              channelSecret: form.lineChannelSecret,
              channelAccessToken: form.lineChannelAccessToken,
              webhookUrl,
            }
          : {
              pageId: form.fbPageId,
              pageName: form.fbPageName,
              accessToken: form.fbAccessToken,
            };

      const response = await fetch(`${apiUrl}/chat-center/channel-accounts/${editing.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
          metadata,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Update failed');
      }
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['channel-accounts', tenantId]);
        setShowModal(false);
      },
      onError: (e: any) => alert(e?.message || 'Update failed'),
    },
  );

  const deleteMutation = useMutation(
    async (acc: ChannelAccount) => {
      if (!tenantId) throw new Error('No tenant selected');
      const ok = window.confirm(`Delete "${acc.name}"?`);
      if (!ok) return { cancelled: true };
      const response = await fetch(`${apiUrl}/chat-center/channel-accounts/${acc.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Delete failed');
      }
      return response.json();
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['channel-accounts', tenantId]),
      onError: (e: any) => alert(e?.message || 'Delete failed'),
    },
  );

  const visibleAccounts = (byChannel[String(activeChannel)] || []) as ChannelAccount[];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Channel Setup</h1>
          <p className="text-sm text-secondary-text mt-1">
            Add multiple channel accounts per tenant (e.g. multiple LINE OA, multiple Facebook Pages).
          </p>
        </div>
        <button
          onClick={() => openCreate(activeChannel)}
          className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
        >
          + Add {channelOptions.find((x) => x.key === activeChannel)?.label}
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {channelOptions.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveChannel(c.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeChannel === c.key ? 'bg-primary text-base' : 'bg-background text-secondary-text hover:bg-border'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-secondary-text">
          {channelOptions.find((x) => x.key === activeChannel)?.hint}
        </div>
      </div>

      {/* Helper */}
      {activeChannel === 'LINE' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">LINE Webhook</h2>
          <div className="text-sm text-secondary-text mb-3">
            Use this webhook URL in LINE Developers (Messaging API). Currently webhook is tenant-based.
          </div>
          <div className="flex items-center gap-3">
            <input
              value={webhookUrl || '-'}
              readOnly
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
            <button
              onClick={() => webhookUrl && navigator.clipboard.writeText(webhookUrl)}
              className="px-4 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {channelOptions.find((x) => x.key === activeChannel)?.label} Accounts ({visibleAccounts.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-secondary-text">Loading...</div>
        ) : visibleAccounts.length ? (
          <div className="divide-y divide-border">
            {visibleAccounts.map((acc) => {
              const meta = acc.metadata || {};
              return (
                <div key={acc.id} className="p-6 flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-base">{acc.name}</div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          String(acc.status).toUpperCase() === 'ACTIVE'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {String(acc.status).toUpperCase()}
                      </span>
                      <div className="text-xs text-secondary-text">
                        Updated: {new Date(acc.updatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {String(acc.channel).toUpperCase() === 'LINE' ? (
                        <>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Channel ID:</span> {metaStr(meta, 'channelId') || '-'}
                          </div>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Access Token:</span>{' '}
                            {maskToken(metaStr(meta, 'channelAccessToken')) || '-'}
                          </div>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Secret:</span> {maskToken(metaStr(meta, 'channelSecret')) || '-'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Page ID:</span> {metaStr(meta, 'pageId') || '-'}
                          </div>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Page Name:</span> {metaStr(meta, 'pageName') || '-'}
                          </div>
                          <div className="text-secondary-text">
                            <span className="font-medium text-base">Access Token:</span>{' '}
                            {maskToken(metaStr(meta, 'accessToken')) || '-'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(acc)}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(acc)}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium text-warning"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-secondary-text">
            No accounts yet. Click “Add” to create your first {channelOptions.find((x) => x.key === activeChannel)?.label} account.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">{editing ? 'Edit Channel Account' : 'Add Channel Account'}</h2>
              <p className="text-sm text-secondary-text mt-1">Create multiple accounts per channel for flexible setup.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Channel</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={form.channel}
                    disabled={!!editing}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as Channel }))}
                  >
                    {channelOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {editing && <div className="text-xs text-secondary-text mt-1">Channel cannot be changed when editing.</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Name</label>
                  <input
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="e.g. LINE Main, LINE Support, FB Page 1"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              {form.channel === 'LINE' ? (
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold">LINE Credentials</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Channel ID</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.lineChannelId}
                        onChange={(e) => setForm((f) => ({ ...f, lineChannelId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Channel Secret</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.lineChannelSecret}
                        onChange={(e) => setForm((f) => ({ ...f, lineChannelSecret: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Channel Access Token</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.lineChannelAccessToken}
                        onChange={(e) => setForm((f) => ({ ...f, lineChannelAccessToken: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-secondary-text">
                    Webhook URL (tenant): <span className="font-mono">{webhookUrl || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold">Meta (Facebook) Credentials</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Page ID</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.fbPageId}
                        onChange={(e) => setForm((f) => ({ ...f, fbPageId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Page Name</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.fbPageName}
                        onChange={(e) => setForm((f) => ({ ...f, fbPageName: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Access Token</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={form.fbAccessToken}
                        onChange={(e) => setForm((f) => ({ ...f, fbAccessToken: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}
                disabled={!form.name || createMutation.isLoading || updateMutation.isLoading}
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
              >
                {editing ? (updateMutation.isLoading ? 'Saving...' : 'Save') : createMutation.isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

