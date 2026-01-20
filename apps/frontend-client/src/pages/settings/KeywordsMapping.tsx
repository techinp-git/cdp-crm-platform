import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Tag = { id: string; name: string; color?: string; description?: string };

type Rule = {
  id: string;
  tenantId: string;
  channel: string;
  name: string;
  status: string;
  matchType: string;
  keywords: any;
  tagIds?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

function ensureArr(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

export function LabelKeywords() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');
  const [testText, setTestText] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState<{
    name: string;
    status: 'ACTIVE' | 'PAUSED';
    matchType: 'CONTAINS' | 'EQUALS';
    keywords: string;
    tagIds: string[];
  }>({
    name: '',
    status: 'ACTIVE',
    matchType: 'CONTAINS',
    keywords: '',
    tagIds: [],
  });

  const { data: tags } = useQuery(
    ['tags', tenantId],
    async () => {
      if (!tenantId) return [] as Tag[];
      const res = await fetch(`${apiUrl}/tags`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const { data: rules, isLoading } = useQuery(
    ['label-keywords-rules', tenantId, q],
    async () => {
      if (!tenantId) return [] as Rule[];
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      params.append('kind', 'LABEL_KEYWORDS');
      const res = await fetch(`${apiUrl}/chat-auto-messager/rules?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch rules');
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const tagMap = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags || []) m.set(t.id, t);
    return m;
  }, [tags]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', status: 'ACTIVE', matchType: 'CONTAINS', keywords: '', tagIds: [] });
    setShowModal(true);
  };

  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({
      name: r.name || '',
      status: (String(r.status || 'ACTIVE').toUpperCase() as any) === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
      matchType: (String(r.matchType || 'CONTAINS').toUpperCase() as any) === 'EQUALS' ? 'EQUALS' : 'CONTAINS',
      keywords: ensureArr(r.keywords).join(', '),
      tagIds: ensureArr(r.tagIds),
    });
    setShowModal(true);
  };

  const saveMutation = useMutation(
    async () => {
      if (!tenantId) throw new Error('No tenant selected');
      const payload = {
        channel: 'ALL',
        name: form.name,
        status: form.status,
        matchType: form.matchType,
        keywords: form.keywords.split(',').map((x) => x.trim()).filter(Boolean),
        tagIds: form.tagIds,
        // Important: mark as label-keywords rule so it doesn't interfere with reply rules
        kind: 'LABEL_KEYWORDS',
        // Ensure no auto-reply payload
        responseKind: 'RAW',
        responsePayload: null,
      };

      const url = editing
        ? `${apiUrl}/chat-auto-messager/rules/${editing.id}`
        : `${apiUrl}/chat-auto-messager/rules`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Save failed');
      }
      return res.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['label-keywords-rules', tenantId]);
        setShowModal(false);
      },
      onError: (e: any) => alert(e?.message || 'Save failed'),
    },
  );

  const deleteMutation = useMutation(
    async (r: Rule) => {
      if (!tenantId) throw new Error('No tenant selected');
      const ok = window.confirm(`Delete rule "${r.name}"?`);
      if (!ok) return { cancelled: true };
      const res = await fetch(`${apiUrl}/chat-auto-messager/rules/${r.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Delete failed');
      }
      return res.json();
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['label-keywords-rules', tenantId]),
      onError: (e: any) => alert(e?.message || 'Delete failed'),
    },
  );

  const testMutation = useMutation(
    async () => {
      if (!tenantId) throw new Error('No tenant selected');
      const res = await fetch(`${apiUrl}/chat-auto-messager/test-match`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: testText, kind: 'LABEL_KEYWORDS' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Test failed');
      }
      return res.json();
    },
    {
      onError: (e: any) => alert(e?.message || 'Test failed'),
    },
  );

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-base">Label Keywords</h1>
            <p className="text-sm text-secondary-text mt-1">
              ใช้ติด label/tag ให้ Customer Profile หลังรับ webhook message หรือ API message เข้ามาในระบบ
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
          >
            + Add Rule
          </button>
        </div>
        <p className="text-sm text-secondary-text mt-1">
          Mapping จะสร้าง <span className="font-mono">CustomerTag</span> เพื่อใช้เป็น Tag data ต่อไป
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="rule name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Test */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Match</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-border rounded-md"
            placeholder="ลองพิมพ์ข้อความ เช่น 'ขอใบเสนอราคา' หรือ 'สนใจ'"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
          />
          <button
            onClick={() => testMutation.mutate()}
            disabled={!testText || testMutation.isLoading}
            className="px-4 py-2 border border-border rounded-md hover:bg-background disabled:opacity-50"
          >
            {testMutation.isLoading ? 'Testing...' : 'Test'}
          </button>
        </div>
        {testMutation.data && (
          <div className="mt-3 text-sm">
            {testMutation.data.matched ? (
              <div className="text-success">
                Matched: <span className="font-medium">{testMutation.data.rule?.name}</span> (
                {(testMutation.data.matchedKeywords || []).join(', ')})
              </div>
            ) : (
              <div className="text-secondary-text">No match</div>
            )}
          </div>
        )}
      </div>

      {/* Rules list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Rules ({(rules || []).length})</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-secondary-text">Loading...</div>
        ) : (rules || []).length ? (
          <div className="divide-y divide-border">
            {(rules || []).map((r) => {
              const kws = ensureArr(r.keywords);
              const tagIds = ensureArr(r.tagIds);
              return (
                <div key={r.id} className="p-6 flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-base">{r.name}</div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          String(r.status).toUpperCase() === 'ACTIVE'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {String(r.status).toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-background text-secondary-text">
                        {String(r.matchType).toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-secondary-text">
                      <span className="font-medium text-base">Keywords:</span> {kws.join(', ') || '-'}
                    </div>
                    <div className="mt-2 text-sm text-secondary-text">
                      <span className="font-medium text-base">Tags:</span>{' '}
                      {tagIds.length
                        ? tagIds
                            .map((id) => tagMap.get(id)?.name || id)
                            .join(', ')
                        : '-'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(r)}
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
            No rules yet. Click “Add Rule” to create your first label-keywords mapping.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">{editing ? 'Edit Rule' : 'Add Rule'}</h2>
              <p className="text-sm text-secondary-text mt-1">Keywords → Tags (auto-label on inbound messages)</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Match Type</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={form.matchType}
                    onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value as any }))}
                  >
                    <option value="CONTAINS">CONTAINS</option>
                    <option value="EQUALS">EQUALS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keywords (comma separated)</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="เช่น สนใจ, ขอใบเสนอราคา, ราคา"
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags to assign</label>
                <div className="max-h-56 overflow-y-auto border border-border rounded-md p-3 space-y-2">
                  {(tags || []).length ? (
                    (tags || []).map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.tagIds.includes(t.id)}
                          onChange={(e) => {
                            setForm((f) => {
                              const next = new Set(f.tagIds);
                              if (e.target.checked) next.add(t.id);
                              else next.delete(t.id);
                              return { ...f, tagIds: Array.from(next) };
                            });
                          }}
                        />
                        <span className="font-medium">{t.name}</span>
                        {t.description ? <span className="text-xs text-secondary-text">{t.description}</span> : null}
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-secondary-text">
                      No tags found. Create tags first in Customer/Tags (or via API).
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.keywords.trim() || saveMutation.isLoading}
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400 disabled:opacity-50"
              >
                {saveMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

