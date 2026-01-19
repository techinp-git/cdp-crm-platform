import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type MessengerContent = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: Status;
  content: any;
  updatedAt: string;
  createdAt: string;
};

type BlockText = { id: string; type: 'text'; text: string };
type BlockImage = { id: string; type: 'image'; url: string };
type BlockVideo = { id: string; type: 'video'; url: string };
type BlockButton = { id: string; type: 'button'; text: string; title: string; url: string };
type Block = BlockText | BlockImage | BlockVideo | BlockButton;

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampText(s: string, n: number) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function buildDefaultBlock(kind: Block['type']): Block {
  const id = uid();
  if (kind === 'text') return { id, type: 'text', text: '' };
  if (kind === 'image') return { id, type: 'image', url: '' };
  if (kind === 'video') return { id, type: 'video', url: '' };
  return { id, type: 'button', text: '', title: '', url: '' };
}

// Map blocks -> Messenger Send API compatible message objects (one request per message)
function toMessengerMessages(blocks: Block[]) {
  return blocks.map((b) => {
    if (b.type === 'text') {
      return { messaging_type: 'RESPONSE', message: { text: b.text } };
    }
    if (b.type === 'image') {
      return {
        messaging_type: 'RESPONSE',
        message: { attachment: { type: 'image', payload: { url: b.url, is_reusable: true } } },
      };
    }
    if (b.type === 'video') {
      return {
        messaging_type: 'RESPONSE',
        message: { attachment: { type: 'video', payload: { url: b.url, is_reusable: true } } },
      };
    }
    // button template
    return {
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: b.text,
            buttons: [{ type: 'web_url', url: b.url, title: b.title }],
          },
        },
      },
    };
  });
}

export function MessengerContentPage() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editing, setEditing] = useState<MessengerContent | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [type, setType] = useState<string | ''>('');

  const [form, setForm] = useState({ name: '', description: '', status: 'DRAFT' as Status });
  const [blocks, setBlocks] = useState<Block[]>([]);

  const queryKey = useMemo(() => ['messenger-contents', tenantId, currentPage, limit, q, status, type], [tenantId, currentPage, limit, q, status, type]);

  const { data: listResponse, isLoading, isError, error } = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (type) params.set('type', type);

      const res = await fetch(`${apiUrl}/messenger-contents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to fetch Messenger contents (HTTP ${res.status})`);
      }
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const items: MessengerContent[] = listResponse?.data || [];
  const totalPages: number = listResponse?.totalPages || 1;
  const total: number = listResponse?.total || 0;

  const upsertMutation = useMutation(
    async () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: 'MESSAGE',
        status: form.status,
        content: toMessengerMessages(blocks),
      };

      const url = editing ? `${apiUrl}/messenger-contents/${editing.id}` : `${apiUrl}/messenger-contents`;
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Save failed');
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['messenger-contents']);
        setMode('list');
        setEditing(null);
        setForm({ name: '', description: '', status: 'DRAFT' });
        setBlocks([]);
      },
    },
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/messenger-contents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Delete failed');
      return data;
    },
    { onSuccess: () => queryClient.invalidateQueries(['messenger-contents']) },
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'DRAFT' });
    setBlocks([]);
    setMode('builder');
  };

  const openEdit = (item: MessengerContent) => {
    setEditing(item);
    setForm({ name: item.name || '', description: item.description || '', status: item.status || 'DRAFT' });
    const incoming = Array.isArray(item.content) ? item.content : [];
    const mapped: Block[] = incoming.map((m: any) => {
      const msg = m?.message || {};
      if (msg?.text) return { id: uid(), type: 'text', text: msg.text };
      const att = msg?.attachment;
      if (att?.type === 'image') return { id: uid(), type: 'image', url: att?.payload?.url || '' };
      if (att?.type === 'video') return { id: uid(), type: 'video', url: att?.payload?.url || '' };
      if (att?.type === 'template' && att?.payload?.template_type === 'button') {
        const btn = att?.payload?.buttons?.[0] || {};
        return { id: uid(), type: 'button', text: att?.payload?.text || '', title: btn?.title || '', url: btn?.url || '' };
      }
      return { id: uid(), type: 'text', text: JSON.stringify(m) };
    });
    setBlocks(mapped);
    setMode('builder');
  };

  const onWidgetDragStart = (e: React.DragEvent, widgetType: Block['type']) => {
    e.dataTransfer.setData('application/x-messenger-widget', widgetType);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const onDesignDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetType = e.dataTransfer.getData('application/x-messenger-widget') as Block['type'];
    if (!widgetType) return;
    setBlocks((prev) => [...prev, buildDefaultBlock(widgetType)]);
  };
  const onDesignDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const updateBlock = (id: string, patch: Partial<Block>) => setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as any) : b)));
  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const jsonArray = toMessengerMessages(blocks);
  const jsonPretty = JSON.stringify(jsonArray, null, 2);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonArray));
      alert('Copied JSON Array');
    } catch {
      alert('Copy failed');
    }
  };

  const saveBuilder = () => {
    if (!form.name.trim()) return alert('Please provide Content Name');
    if (blocks.length === 0) return alert('Please drag at least 1 widget into Design');
    const invalid = blocks.some((b) => {
      if (b.type === 'text') return !b.text.trim();
      if (b.type === 'image') return !b.url.trim();
      if (b.type === 'video') return !b.url.trim();
      return !b.text.trim() || !b.title.trim() || !b.url.trim();
    });
    if (invalid) return alert('Please fill required fields for all blocks');
    upsertMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Messenger Content</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (mode === 'builder') {
    return (
      <div>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">Content Name</div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 px-3 py-2 border border-border rounded-md"
              placeholder="Content Name..."
            />
            <button
              onClick={saveBuilder}
              disabled={upsertMutation.isLoading}
              className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setMode('list');
                setEditing(null);
              }}
              className="px-4 py-2 border border-border rounded-md hover:bg-background"
            >
              Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* JSON Viewer */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-black text-primary font-bold px-5 py-3">JSON Viewer</div>
            <div className="p-5">
              <div className="bg-black rounded-lg p-4 text-white">
                <div className="font-bold mb-3">JSON Array Data ({jsonArray.length} items)</div>
                <pre className="bg-slate-900/60 border border-slate-700 rounded-md p-3 text-xs overflow-auto max-h-[360px]">
                  {jsonPretty}
                </pre>
                <button
                  type="button"
                  onClick={copyJson}
                  className="mt-4 w-full border border-yellow-400 text-yellow-300 px-4 py-2 rounded-md font-medium hover:bg-yellow-400/10"
                >
                  Copy JSON Array
                </button>
              </div>
            </div>
          </div>

          {/* Design */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-black text-primary font-bold px-5 py-3">Design</div>
            <div className="p-5">
              <div onDrop={onDesignDrop} onDragOver={onDesignDragOver} className="min-h-[460px] rounded-lg border-2 border-dashed border-border bg-background p-4">
                {blocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-secondary-text">
                    Drag widgets from the right panel and drop here
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blocks.map((b, idx) => (
                      <div key={b.id} className="bg-white border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">
                              {idx + 1}. {b.type === 'text' ? 'Text Message' : b.type === 'image' ? 'Image' : b.type === 'video' ? 'Video' : 'Button Template'}
                            </div>
                            <div className="text-xs text-secondary-text mt-1">
                              {b.type === 'text'
                                ? clampText(b.text, 60) || '—'
                                : b.type === 'image' || b.type === 'video'
                                  ? clampText(b.url, 60) || '—'
                                  : `${clampText(b.text, 24)} | ${clampText(b.title, 18)} → ${clampText(b.url, 24)}`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => moveBlock(b.id, -1)} disabled={idx === 0} className="px-2 py-1 text-xs border border-border rounded hover:bg-background disabled:opacity-50">
                              ↑
                            </button>
                            <button onClick={() => moveBlock(b.id, 1)} disabled={idx === blocks.length - 1} className="px-2 py-1 text-xs border border-border rounded hover:bg-background disabled:opacity-50">
                              ↓
                            </button>
                            <button onClick={() => removeBlock(b.id)} className="px-2 py-1 text-xs bg-error/10 text-error rounded hover:bg-error/20">
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {b.type === 'text' && (
                            <div>
                              <label className="block text-sm font-medium mb-2">Text</label>
                              <textarea value={b.text} onChange={(e) => updateBlock(b.id, { text: e.target.value } as any)} className="w-full px-3 py-2 border border-border rounded-md" rows={4} placeholder="Type message..." />
                            </div>
                          )}
                          {(b.type === 'image' || b.type === 'video') && (
                            <div>
                              <label className="block text-sm font-medium mb-2">{b.type === 'image' ? 'Image URL' : 'Video URL'}</label>
                              <input value={b.url} onChange={(e) => updateBlock(b.id, { url: e.target.value } as any)} className="w-full px-3 py-2 border border-border rounded-md" placeholder="https://..." />
                            </div>
                          )}
                          {b.type === 'button' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Message Text</label>
                                <input value={b.text} onChange={(e) => updateBlock(b.id, { text: e.target.value } as any)} className="w-full px-3 py-2 border border-border rounded-md" placeholder="e.g., Choose an option" />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Button Title</label>
                                  <input value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value } as any)} className="w-full px-3 py-2 border border-border rounded-md" placeholder="e.g., View" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Button URL</label>
                                  <input value={b.url} onChange={(e) => updateBlock(b.id, { url: e.target.value } as any)} className="w-full px-3 py-2 border border-border rounded-md" placeholder="https://..." />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {upsertMutation.isError && (
                <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                  {upsertMutation.error instanceof Error ? upsertMutation.error.message : 'Save failed'}
                </div>
              )}
            </div>
          </div>

          {/* Widget */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-black text-primary font-bold px-5 py-3">Widget</div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div draggable onDragStart={(e) => onWidgetDragStart(e, 'text')} className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background">
                  <div className="text-sm font-semibold mb-2">Text</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">Drag to Design</div>
                </div>
                <div draggable onDragStart={(e) => onWidgetDragStart(e, 'image')} className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background">
                  <div className="text-sm font-semibold mb-2">Image</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">Attachment</div>
                </div>
                <div draggable onDragStart={(e) => onWidgetDragStart(e, 'button')} className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background">
                  <div className="text-sm font-semibold mb-2">Button</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">Button Template</div>
                </div>
                <div draggable onDragStart={(e) => onWidgetDragStart(e, 'video')} className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background">
                  <div className="text-sm font-semibold mb-2">Video</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">Attachment</div>
                </div>
              </div>
              <div className="mt-5 text-xs text-secondary-text">
                Output is an array of Messenger Send API request bodies (message objects). You can send them sequentially.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Messenger Content</h1>
          <p className="text-sm text-secondary-text mt-1">Create message templates for Facebook Messenger</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400">
          + New Content
        </button>
      </div>

      {isError && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-md text-sm">
          {error instanceof Error ? error.message : 'Failed to load Messenger contents'}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name..."
            className="w-full px-3 py-2 border border-border rounded-md"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-md"
          >
            <option value="">All Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-border rounded-md"
          >
            <option value="">All Types</option>
            <option value="MESSAGE">MESSAGE</option>
          </select>
          <div className="text-sm text-secondary-text flex items-center justify-end">{total.toLocaleString('th-TH')} items</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.name}</div>
                      {item.description ? <div className="text-xs text-secondary-text mt-1">{item.description}</div> : null}
                      {Array.isArray(item.content) && item.content.length > 0 ? (
                        <div className="text-xs text-secondary-text mt-1 line-clamp-1">{clampText(JSON.stringify(item.content[0]), 120)}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm">{item.type}</td>
                    <td className="px-6 py-4 text-sm">{item.status}</td>
                    <td className="px-6 py-4 text-sm text-secondary-text">{item.updatedAt ? new Date(item.updatedAt).toLocaleString('th-TH') : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="px-3 py-2 text-sm bg-background rounded hover:bg-gray-100">
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id);
                          }}
                          className="px-3 py-2 text-sm bg-error/10 text-error rounded hover:bg-error/20"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary-text">
                    No Messenger content found. Create your first template to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-secondary-text">
              Page {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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

