import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type LineContentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type LineContentType = 'TEXT' | 'FLEX' | 'RICHMENU' | string;

type LineContent = {
  id: string;
  name: string;
  description?: string | null;
  type: LineContentType;
  status: LineContentStatus;
  content: any;
  updatedAt: string;
  createdAt: string;
};

type BlockText = { id: string; type: 'text'; text: string };
type BlockImage = { id: string; type: 'image'; imageUrl: string; altText?: string };
type BlockImageButton = { id: string; type: 'image_button'; imageUrl: string; linkUrl: string };
type BlockVideo = { id: string; type: 'video'; videoUrl: string; previewImageUrl: string };
type ContentBlock = BlockText | BlockImage | BlockImageButton | BlockVideo;

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampText(s: string, n: number) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function buildDefaultBlock(kind: ContentBlock['type']): ContentBlock {
  const id = uid();
  if (kind === 'text') return { id, type: 'text', text: '' };
  if (kind === 'image') return { id, type: 'image', imageUrl: '', altText: '' };
  if (kind === 'image_button') return { id, type: 'image_button', imageUrl: '', linkUrl: '' };
  return { id, type: 'video', videoUrl: '', previewImageUrl: '' };
}

function toLineContentType(blocks: ContentBlock[]): LineContentType {
  // Simple heuristic: if only text blocks -> TEXT, else FLEX (placeholder)
  const kinds = new Set(blocks.map((b) => b.type));
  return kinds.size === 1 && kinds.has('text') ? 'TEXT' : 'FLEX';
}

export function LineContentPage() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<LineContentStatus | ''>('');
  const [type, setType] = useState<LineContentType | ''>('');

  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editing, setEditing] = useState<LineContent | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'DRAFT' as LineContentStatus,
  });
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const queryKey = useMemo(
    () => ['line-contents', tenantId, currentPage, limit, q, status, type],
    [tenantId, currentPage, limit, q, status, type],
  );

  const {
    data: listResponse,
    isLoading,
    isError: isListError,
    error: listError,
  } = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (type) params.set('type', type);

      const res = await fetch(`${apiUrl}/line-contents?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to fetch LINE contents (HTTP ${res.status})`);
      }
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const items: LineContent[] = listResponse?.data || [];
  const totalPages: number = listResponse?.totalPages || 1;
  const total: number = listResponse?.total || 0;

  const upsertMutation = useMutation(
    async (payloadOverride?: any) => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        type: toLineContentType(blocks),
        status: form.status,
        // Store as JSON array as requested
        content: blocks.map((b) => {
          const { id, ...rest } = b as any;
          return rest;
        }),
        ...(payloadOverride || {}),
      };

      const url = editing ? `${apiUrl}/line-contents/${editing.id}` : `${apiUrl}/line-contents`;
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
        queryClient.invalidateQueries(['line-contents']);
        setMode('list');
        setEditing(null);
        setForm({ name: '', description: '', status: 'DRAFT' });
        setBlocks([]);
      },
    },
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/line-contents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Delete failed');
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['line-contents']);
      },
    },
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'DRAFT' });
    setBlocks([]);
    setMode('builder');
  };

  const openEdit = (item: LineContent) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      status: item.status || 'DRAFT',
    });
    const incoming = Array.isArray(item.content) ? item.content : [];
    const mapped: ContentBlock[] = incoming.map((b: any) => {
      const t = String(b?.type || '').toLowerCase();
      if (t === 'text') return { id: uid(), type: 'text', text: b.text || '' };
      if (t === 'image') return { id: uid(), type: 'image', imageUrl: b.imageUrl || '', altText: b.altText || '' };
      if (t === 'image_button')
        return { id: uid(), type: 'image_button', imageUrl: b.imageUrl || '', linkUrl: b.linkUrl || '' };
      if (t === 'video')
        return { id: uid(), type: 'video', videoUrl: b.videoUrl || '', previewImageUrl: b.previewImageUrl || '' };
      // fallback to text
      return { id: uid(), type: 'text', text: JSON.stringify(b) };
    });
    setBlocks(mapped);
    setMode('builder');
  };

  const statusBadge = (s: LineContentStatus) => {
    const cls =
      s === 'ACTIVE'
        ? 'bg-success/20 text-success'
        : s === 'ARCHIVED'
          ? 'bg-background text-secondary-text'
          : 'bg-warning/20 text-warning';
    return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>;
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
        <div className="text-lg font-semibold mb-2">LINE Content</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  const jsonArray = blocks.map((b) => {
    const { id, ...rest } = b as any;
    return rest;
  });

  const jsonPretty = JSON.stringify(jsonArray, null, 2);

  const copyJsonArray = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonArray));
      alert('Copied JSON Array');
    } catch {
      alert('Copy failed');
    }
  };

  const onWidgetDragStart = (e: React.DragEvent, widgetType: ContentBlock['type']) => {
    e.dataTransfer.setData('application/x-line-widget', widgetType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDesignDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetType = e.dataTransfer.getData('application/x-line-widget') as ContentBlock['type'];
    if (!widgetType) return;
    setBlocks((prev) => [...prev, buildDefaultBlock(widgetType)]);
  };

  const onDesignDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as any) : b)));
  };

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

  const saveBuilder = () => {
    if (!form.name.trim()) {
      alert('Please provide Content Name');
      return;
    }
    if (blocks.length === 0) {
      alert('Please drag at least 1 widget into Design');
      return;
    }
    // Basic validation
    const invalid = blocks.some((b) => {
      if (b.type === 'text') return !b.text.trim();
      if (b.type === 'image') return !b.imageUrl.trim();
      if (b.type === 'image_button') return !b.imageUrl.trim() || !b.linkUrl.trim();
      if (b.type === 'video') return !b.videoUrl.trim() || !b.previewImageUrl.trim();
      return true;
    });
    if (invalid) {
      alert('Please fill required fields for all blocks');
      return;
    }
    upsertMutation.mutate(undefined);
  };

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
                  onClick={copyJsonArray}
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
              <div
                onDrop={onDesignDrop}
                onDragOver={onDesignDragOver}
                className="min-h-[460px] rounded-lg border-2 border-dashed border-border bg-background p-4"
              >
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
                              {idx + 1}. {b.type === 'text'
                                ? 'Text Message'
                                : b.type === 'image'
                                  ? 'Image'
                                  : b.type === 'image_button'
                                    ? 'Image Button URL'
                                    : 'Video'}
                            </div>
                            <div className="text-xs text-secondary-text mt-1">
                              {b.type === 'text'
                                ? clampText(b.text, 60) || '—'
                                : b.type === 'image'
                                  ? clampText(b.imageUrl, 60) || '—'
                                  : b.type === 'image_button'
                                    ? `${clampText(b.imageUrl, 34)} → ${clampText(b.linkUrl, 34)}`
                                    : `${clampText(b.videoUrl, 34)} / ${clampText(b.previewImageUrl, 34)}`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveBlock(b.id, -1)}
                              disabled={idx === 0}
                              className="px-2 py-1 text-xs border border-border rounded hover:bg-background disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveBlock(b.id, 1)}
                              disabled={idx === blocks.length - 1}
                              className="px-2 py-1 text-xs border border-border rounded hover:bg-background disabled:opacity-50"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeBlock(b.id)}
                              className="px-2 py-1 text-xs bg-error/10 text-error rounded hover:bg-error/20"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Editors */}
                        <div className="mt-4 space-y-3">
                          {b.type === 'text' && (
                            <div>
                              <label className="block text-sm font-medium mb-2">Text</label>
                              <textarea
                                value={b.text}
                                onChange={(e) => updateBlock(b.id, { text: e.target.value } as any)}
                                className="w-full px-3 py-2 border border-border rounded-md"
                                rows={4}
                                placeholder="Type message..."
                              />
                            </div>
                          )}

                          {b.type === 'image' && (
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Image URL</label>
                                <input
                                  value={b.imageUrl}
                                  onChange={(e) => updateBlock(b.id, { imageUrl: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Alt Text (optional)</label>
                                <input
                                  value={b.altText || ''}
                                  onChange={(e) => updateBlock(b.id, { altText: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="Optional"
                                />
                              </div>
                            </div>
                          )}

                          {b.type === 'image_button' && (
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Image URL</label>
                                <input
                                  value={b.imageUrl}
                                  onChange={(e) => updateBlock(b.id, { imageUrl: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Link URL</label>
                                <input
                                  value={b.linkUrl}
                                  onChange={(e) => updateBlock(b.id, { linkUrl: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          )}

                          {b.type === 'video' && (
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Video URL</label>
                                <input
                                  value={b.videoUrl}
                                  onChange={(e) => updateBlock(b.id, { videoUrl: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Preview Image URL</label>
                                <input
                                  value={b.previewImageUrl}
                                  onChange={(e) => updateBlock(b.id, { previewImageUrl: e.target.value } as any)}
                                  className="w-full px-3 py-2 border border-border rounded-md"
                                  placeholder="https://..."
                                />
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
                <div
                  draggable
                  onDragStart={(e) => onWidgetDragStart(e, 'text')}
                  className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background"
                >
                  <div className="text-sm font-semibold mb-2">Text Message</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">
                    Drag to Design
                  </div>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onWidgetDragStart(e, 'image')}
                  className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background"
                >
                  <div className="text-sm font-semibold mb-2">Image</div>
                  <div className="bg-black rounded p-4 text-center text-white text-xs">
                    Size
                    <div className="font-bold">800 x 800</div>
                  </div>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onWidgetDragStart(e, 'image_button')}
                  className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background"
                >
                  <div className="text-sm font-semibold mb-2">Image Button URL</div>
                  <div className="bg-background rounded p-2 text-xs text-secondary-text">
                    Drag to Design
                  </div>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onWidgetDragStart(e, 'video')}
                  className="border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-background"
                >
                  <div className="text-sm font-semibold mb-2">Video</div>
                  <div className="bg-black rounded p-4 text-center text-white text-xs">
                    Size
                    <div className="font-bold">1280 x 720</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-xs text-secondary-text">
                Tip: drag a widget and drop into “Design” to generate JSON array output.
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
          <h1 className="text-2xl font-bold text-base">LINE Content</h1>
          <p className="text-sm text-secondary-text mt-1">Create, manage and reuse LINE message templates</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
        >
          + New Content
        </button>
      </div>

      {isListError && (
        <div className="mb-6 p-4 bg-error/10 text-error rounded-md text-sm">
          {listError instanceof Error ? listError.message : 'Failed to load LINE contents. Please check API server / permissions.'}
        </div>
      )}

      {/* Filters */}
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
            <option value="TEXT">TEXT</option>
            <option value="FLEX">FLEX</option>
            <option value="RICHMENU">RICHMENU</option>
          </select>
          <div className="text-sm text-secondary-text flex items-center justify-end">
            {total.toLocaleString('th-TH')} items
          </div>
        </div>
      </div>

      {/* Table */}
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
                      {item.description ? (
                        <div className="text-xs text-secondary-text mt-1">{item.description}</div>
                      ) : null}
                      {Array.isArray(item.content) && item.content.length > 0 ? (
                        <div className="text-xs text-secondary-text mt-1 line-clamp-1">
                          {item.content[0]?.type
                            ? `${String(item.content[0].type)}: ${clampText(JSON.stringify(item.content[0]), 90)}`
                            : clampText(JSON.stringify(item.content[0]), 120)}
                        </div>
                      ) : item.content?.messageText ? (
                        <div className="text-xs text-secondary-text mt-1 line-clamp-1">
                          {String(item.content.messageText).slice(0, 120)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm">{item.type}</td>
                    <td className="px-6 py-4">{statusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-sm text-secondary-text">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-3 py-2 text-sm bg-background rounded hover:bg-gray-100"
                        >
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
                    No LINE content found. Create your first template to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

