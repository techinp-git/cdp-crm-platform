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

function metaStr(meta: any, key: string) {
  const v = meta?.[key];
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function tryParseJson(s: string) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Invalid JSON' };
  }
}

export function ApiWebhook() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [activeChannel, setActiveChannel] = useState<Channel>('LINE');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChannelAccount | null>(null);
  const [jsonText, setJsonText] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string>('');

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
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [accounts]);

  const visibleAccounts = (byChannel[String(activeChannel)] || []) as ChannelAccount[];

  const buildWebhookUrl = (acc: ChannelAccount) => {
    const ch = String(acc.channel || '').toUpperCase();
    if (ch === 'LINE') return `${apiUrl}/line-events/webhook/${tenantId}/${acc.id}`;
    // Flexible placeholder: store your own receiver URL in metadata.webhookUrl if needed
    return metaStr(acc.metadata, 'webhookUrl') || '-';
  };

  const openEdit = (acc: ChannelAccount) => {
    setEditing(acc);
    const current = acc.metadata || {};
    setJsonText(JSON.stringify(current, null, 2));
    setJsonError('');
    setShowModal(true);
  };

  const updateMutation = useMutation(
    async () => {
      if (!tenantId) throw new Error('No tenant selected');
      if (!editing) throw new Error('No editing record');
      const parsed = tryParseJson(jsonText);
      if (!parsed.ok) throw new Error(parsed.error);

      const response = await fetch(`${apiUrl}/chat-center/channel-accounts/${editing.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata: parsed.value }),
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

  const channelTabs: Array<{ key: Channel; label: string; hint: string }> = [
    { key: 'LINE', label: 'LINE', hint: 'Incoming webhook URL is generated per account' },
    { key: 'FACEBOOK', label: 'Facebook', hint: 'Store webhook config in metadata (flexible)' },
    { key: 'MESSENGER', label: 'Messenger', hint: 'Store webhook config in metadata (flexible)' },
    { key: 'IG', label: 'Instagram', hint: 'Store webhook config in metadata (flexible)' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base">API & Webhook</h1>
        <p className="text-sm text-secondary-text mt-1">
          รองรับหลายบัญชีต่อ channel และเก็บ config แบบยืดหยุ่นใน <span className="font-mono">metadata</span> ของแต่ละ account
        </p>
      </div>

      {/* API Basics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">API Basics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-secondary-text mb-1">Base URL</div>
            <div className="font-mono px-3 py-2 border border-border rounded-md bg-background">{apiUrl}</div>
          </div>
          <div>
            <div className="text-secondary-text mb-1">Tenant Header</div>
            <div className="font-mono px-3 py-2 border border-border rounded-md bg-background">
              x-tenant-id: {tenantId || '-'}
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-secondary-text">
          ใช้ <span className="font-mono">Authorization: Bearer &lt;token&gt;</span> + <span className="font-mono">x-tenant-id</span> ทุกครั้ง
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {channelTabs.map((c) => (
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
        <div className="mt-3 text-xs text-secondary-text">{channelTabs.find((x) => x.key === activeChannel)?.hint}</div>
      </div>

      {/* Accounts */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {activeChannel} Accounts ({visibleAccounts.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-secondary-text">Loading...</div>
        ) : visibleAccounts.length ? (
          <div className="divide-y divide-border">
            {visibleAccounts.map((acc) => {
              const webhookUrl = tenantId ? buildWebhookUrl(acc) : '-';
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

                    <div className="mt-3">
                      <div className="text-sm text-secondary-text mb-1">Webhook URL</div>
                      <div className="flex items-center gap-2">
                        <input
                          value={webhookUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm font-mono"
                        />
                        <button
                          onClick={() => webhookUrl !== '-' && navigator.clipboard.writeText(webhookUrl)}
                          className="px-4 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                        >
                          Copy
                        </button>
                      </div>
                      {String(acc.channel).toUpperCase() !== 'LINE' && (
                        <div className="text-xs text-secondary-text mt-2">
                          ถ้า channel นี้มี endpoint webhook ของคุณเอง ให้ใส่ใน <span className="font-mono">metadata.webhookUrl</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="text-secondary-text">
                        <span className="font-medium text-base">Verify Token:</span>{' '}
                        {metaStr(acc.metadata, 'verifyToken') || '-'}
                      </div>
                      <div className="text-secondary-text">
                        <span className="font-medium text-base">Signing Secret:</span>{' '}
                        {metaStr(acc.metadata, 'signingSecret') ? '••••••••' : '-'}
                      </div>
                      <div className="text-secondary-text">
                        <span className="font-medium text-base">Subscribed:</span>{' '}
                        {Array.isArray(acc.metadata?.subscribedEvents)
                          ? acc.metadata.subscribedEvents.join(', ')
                          : metaStr(acc.metadata, 'subscribedEvents') || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(acc)}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                    >
                      Edit metadata
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-secondary-text">
            No accounts in this channel. Go to <span className="font-mono">/settings/channels</span> to add channel accounts first.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Edit metadata</h2>
              <p className="text-sm text-secondary-text mt-1">
                {editing.name} ({String(editing.channel).toUpperCase()}) — ปรับ config ได้แบบยืดหยุ่น
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-sm text-secondary-text">
                แนะนำ keys: <span className="font-mono">webhookUrl</span>, <span className="font-mono">verifyToken</span>,{' '}
                <span className="font-mono">signingSecret</span>, <span className="font-mono">subscribedEvents</span>
              </div>
              <textarea
                rows={14}
                className="w-full px-3 py-2 border border-border rounded-md font-mono text-sm"
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  const parsed = tryParseJson(e.target.value);
                  setJsonError(parsed.ok ? '' : parsed.error);
                }}
              />
              {jsonError && <div className="text-sm text-warning">JSON error: {jsonError}</div>}
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!!jsonError || updateMutation.isLoading}
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
              >
                {updateMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

