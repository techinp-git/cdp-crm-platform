import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type ChannelKey = 'LINE' | 'MESSENGER' | string;
type RuleStatus = 'ACTIVE' | 'PAUSED';
type MatchType = 'CONTAINS' | 'EQUALS';
type ResponseKind = 'LINE_CONTENT' | 'MESSENGER_CONTENT' | 'RAW';

type Rule = {
  id: string;
  channel: ChannelKey;
  name: string;
  status: RuleStatus;
  matchType: MatchType;
  keywords: string[];
  responseKind: ResponseKind;
  lineContentId?: string | null;
  messengerContentId?: string | null;
  responsePayload?: any;
  updatedAt: string;
};

type ContentItem = { id: string; name: string; type: string; status: string; updatedAt: string };

function splitTags(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ChatAutoMessager() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [activeChannel, setActiveChannel] = useState<ChannelKey>('LINE');
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const [form, setForm] = useState({
    name: '',
    status: 'ACTIVE' as RuleStatus,
    matchType: 'CONTAINS' as MatchType,
    keywordsInput: '',
    responseKind: 'LINE_CONTENT' as ResponseKind,
    lineContentId: '',
    messengerContentId: '',
    rawJson: '[]',
  });

  const channelsQuery = useQuery(
    ['chat-auto-channels'],
    async () => {
      const res = await fetch(`${apiUrl}/chat-auto-messager/channels`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) throw new Error('Failed to load channels');
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const channels: Array<{ key: string; label: string }> = channelsQuery.data || [
    { key: 'LINE', label: 'LINE' },
    { key: 'MESSENGER', label: 'Messenger' },
  ];

  const rulesQueryKey = useMemo(() => ['chat-auto-rules', tenantId, activeChannel, q], [tenantId, activeChannel, q]);

  const rulesQuery = useQuery(
    rulesQueryKey,
    async () => {
      const params = new URLSearchParams({ channel: String(activeChannel) });
      if (q) params.set('q', q);
      const res = await fetch(`${apiUrl}/chat-auto-messager/rules?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load rules');
      return data as Rule[];
    },
    { enabled: !!tenantId },
  );

  const lineContentsQuery = useQuery(
    ['line-contents-lite', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/line-contents?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load line contents');
      return (data?.data || []) as ContentItem[];
    },
    { enabled: !!tenantId },
  );

  const messengerContentsQuery = useQuery(
    ['messenger-contents-lite', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/messenger-contents?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load messenger contents');
      return (data?.data || []) as ContentItem[];
    },
    { enabled: !!tenantId },
  );

  const createOrUpdateMutation = useMutation(
    async () => {
      const keywords = splitTags(form.keywordsInput);
      if (!form.name.trim()) throw new Error('Name is required');
      if (keywords.length === 0) throw new Error('Please add at least 1 keyword');

      const payload: any = {
        channel: activeChannel,
        name: form.name.trim(),
        status: form.status,
        matchType: form.matchType,
        keywords,
        responseKind: form.responseKind,
      };

      if (form.responseKind === 'LINE_CONTENT') payload.lineContentId = form.lineContentId || null;
      if (form.responseKind === 'MESSENGER_CONTENT') payload.messengerContentId = form.messengerContentId || null;
      if (form.responseKind === 'RAW') {
        try {
          payload.responsePayload = JSON.parse(form.rawJson || '[]');
        } catch {
          throw new Error('RAW JSON is invalid');
        }
      }

      const url = editing ? `${apiUrl}/chat-auto-messager/rules/${editing.id}` : `${apiUrl}/chat-auto-messager/rules`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Save failed');
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat-auto-rules']);
        setShowModal(false);
        setEditing(null);
      },
    },
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/chat-auto-messager/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Delete failed');
      return data;
    },
    { onSuccess: () => queryClient.invalidateQueries(['chat-auto-rules']) },
  );

  const [testText, setTestText] = useState('');
  const testMutation = useMutation(async () => {
    const res = await fetch(`${apiUrl}/chat-auto-messager/test-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      body: JSON.stringify({ channel: activeChannel, text: testText }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Test failed');
    return data;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      status: 'ACTIVE',
      matchType: 'CONTAINS',
      keywordsInput: '',
      responseKind: activeChannel === 'LINE' ? 'LINE_CONTENT' : 'MESSENGER_CONTENT',
      lineContentId: '',
      messengerContentId: '',
      rawJson: '[]',
    });
    setShowModal(true);
  };

  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({
      name: r.name || '',
      status: (r.status as RuleStatus) || 'ACTIVE',
      matchType: (r.matchType as MatchType) || 'CONTAINS',
      keywordsInput: Array.isArray(r.keywords) ? r.keywords.join(', ') : '',
      responseKind: (r.responseKind as ResponseKind) || 'RAW',
      lineContentId: r.lineContentId || '',
      messengerContentId: r.messengerContentId || '',
      rawJson: JSON.stringify(r.responsePayload || [], null, 2),
    });
    setShowModal(true);
  };

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Chat Auto Messager</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  const rules: Rule[] = rulesQuery.data || [];
  const lineContents = lineContentsQuery.data || [];
  const messengerContents = messengerContentsQuery.data || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base">Chat Auto Messager</h1>
        <p className="text-sm text-secondary-text mt-1">
          Auto-reply by channel + keyword tags → send prepared content
        </p>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-border px-4">
          <nav className="flex gap-2">
            {channels.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveChannel(c.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeChannel === c.key ? 'border-primary text-primary' : 'border-transparent text-secondary-text hover:text-base'
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rule name..."
            className="flex-1 px-3 py-2 border border-border rounded-md"
          />
          <button
            onClick={openCreate}
            className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
          >
            + New Rule
          </button>
        </div>
      </div>

      {(rulesQuery.isError || channelsQuery.isError) && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-md text-sm">
          {(rulesQuery.error as any)?.message || (channelsQuery.error as any)?.message || 'Failed to load data'}
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold">Rules</div>
          <div className="text-sm text-secondary-text">{rules.length} rules</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Keywords</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Match</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {rules.length > 0 ? (
                rules.map((r) => (
                  <tr key={r.id} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-secondary-text mt-1">{r.channel}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {Array.isArray(r.keywords) ? r.keywords.slice(0, 6).map((k) => (
                        <span key={k} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-background rounded text-xs">
                          {k}
                        </span>
                      )) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">{r.matchType}</td>
                    <td className="px-6 py-4 text-sm">
                      {r.responseKind === 'LINE_CONTENT'
                        ? 'LINE Content'
                        : r.responseKind === 'MESSENGER_CONTENT'
                          ? 'Messenger Content'
                          : 'RAW JSON'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="px-3 py-2 text-sm bg-background rounded hover:bg-gray-100" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button
                          className="px-3 py-2 text-sm bg-error/10 text-error rounded hover:bg-error/20"
                          onClick={() => {
                            if (confirm(`Delete "${r.name}"?`)) deleteMutation.mutate(r.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-secondary-text">
                    No rules yet. Create a rule to auto-reply by keywords.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Match */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Test keyword matching</div>
          <div className="text-xs text-secondary-text">Channel: {activeChannel}</div>
        </div>
        <div className="flex gap-3">
          <input
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md"
            placeholder="Type incoming message text..."
          />
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isLoading || !testText.trim()}
            className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
          >
            {testMutation.isLoading ? 'Testing...' : 'Test'}
          </button>
        </div>
        {testMutation.isError && (
          <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
            {testMutation.error instanceof Error ? testMutation.error.message : 'Test failed'}
          </div>
        )}
        {testMutation.isSuccess && (
          <div className="mt-4">
            {(testMutation.data as any)?.matched ? (
              <div className="p-4 bg-success/10 rounded-md">
                <div className="font-medium mb-1">Matched</div>
                <div className="text-sm text-secondary-text mb-2">
                  Rule: {(testMutation.data as any)?.rule?.name}
                </div>
                <pre className="text-xs bg-white border border-border rounded-md p-3 overflow-auto max-h-[200px]">
                  {JSON.stringify((testMutation.data as any)?.responsePayload, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 bg-background rounded-md text-sm text-secondary-text">
                No rule matched.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">{editing ? 'Edit Rule' : 'New Rule'}</h2>
              <button onClick={() => setShowModal(false)} className="text-secondary-text hover:text-base text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rule Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., Promo keyword reply"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Match Type</label>
                  <select
                    value={form.matchType}
                    onChange={(e) => setForm({ ...form, matchType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="CONTAINS">CONTAINS</option>
                    <option value="EQUALS">EQUALS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Response Kind</label>
                  <select
                    value={form.responseKind}
                    onChange={(e) => setForm({ ...form, responseKind: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="LINE_CONTENT">LINE_CONTENT</option>
                    <option value="MESSENGER_CONTENT">MESSENGER_CONTENT</option>
                    <option value="RAW">RAW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Keywords (comma separated)</label>
                <input
                  value={form.keywordsInput}
                  onChange={(e) => setForm({ ...form, keywordsInput: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="promo, ส่วนลด, ราคา"
                />
                <div className="text-xs text-secondary-text mt-1">
                  ระบบจะ match แบบ tag: ใส่ได้หลายคำ, ไม่สนตัวพิมพ์เล็ก/ใหญ่
                </div>
              </div>

              {form.responseKind === 'LINE_CONTENT' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select LINE Content</label>
                  <select
                    value={form.lineContentId}
                    onChange={(e) => setForm({ ...form, lineContentId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="">-- select --</option>
                    {lineContents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.responseKind === 'MESSENGER_CONTENT' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Messenger Content</label>
                  <select
                    value={form.messengerContentId}
                    onChange={(e) => setForm({ ...form, messengerContentId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="">-- select --</option>
                    {messengerContents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.responseKind === 'RAW' && (
                <div>
                  <label className="block text-sm font-medium mb-2">RAW JSON Payload</label>
                  <textarea
                    value={form.rawJson}
                    onChange={(e) => setForm({ ...form, rawJson: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md font-mono text-xs"
                    rows={8}
                  />
                </div>
              )}

              {createOrUpdateMutation.isError && (
                <div className="p-3 bg-error/10 text-error rounded-md text-sm">
                  {createOrUpdateMutation.error instanceof Error ? createOrUpdateMutation.error.message : 'Save failed'}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createOrUpdateMutation.mutate()}
                  disabled={createOrUpdateMutation.isLoading}
                  className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createOrUpdateMutation.isLoading ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

