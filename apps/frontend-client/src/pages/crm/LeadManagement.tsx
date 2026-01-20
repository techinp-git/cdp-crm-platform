import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Lead = {
  id: string;
  tenantId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  source?: string | null;
  status: string;
  score?: number | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

type LeadsResponse = {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
const priorities = ['HOT', 'WARM', 'COLD', 'NONE'] as const;

function statusPillClass(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'NEW') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s === 'CONTACTED') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'QUALIFIED') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (s === 'CONVERTED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'LOST') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function statusHeaderClass(status: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'NEW') return 'bg-gradient-to-r from-blue-50 to-white border-blue-200';
  if (s === 'CONTACTED') return 'bg-gradient-to-r from-amber-50 to-white border-amber-200';
  if (s === 'QUALIFIED') return 'bg-gradient-to-r from-purple-50 to-white border-purple-200';
  if (s === 'CONVERTED') return 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200';
  if (s === 'LOST') return 'bg-gradient-to-r from-rose-50 to-white border-rose-200';
  return 'bg-background border-border';
}

function priorityPillClass(priority: string) {
  const p = String(priority || '').toUpperCase();
  if (p === 'HOT') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (p === 'WARM') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (p === 'COLD') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function priorityBorderClass(priority: string) {
  const p = String(priority || '').toUpperCase();
  if (p === 'HOT') return 'border-l-4 border-rose-400';
  if (p === 'WARM') return 'border-l-4 border-amber-400';
  if (p === 'COLD') return 'border-l-4 border-sky-400';
  return 'border-l-4 border-gray-200';
}

function scoreBarClass(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function fullName(l: Lead) {
  const n = `${l.firstName || ''} ${l.lastName || ''}`.trim();
  return n || l.email || l.phone || l.id.slice(0, 8);
}

function priorityOf(l: Lead): (typeof priorities)[number] {
  const p = String(l?.metadata?.priority || '').toUpperCase();
  return (priorities as any).includes(p) ? (p as any) : 'NONE';
}

function noteOf(l: Lead): string {
  return typeof l?.metadata?.note === 'string' ? l.metadata.note : '';
}

function suggestedScore(l: Lead): number {
  // Simple heuristic: completeness + source + recency + status
  let s = 0;
  if (l.email) s += 20;
  if (l.phone) s += 15;
  if (l.company) s += 10;
  if (l.title) s += 5;

  const source = String(l.source || '').toUpperCase();
  if (source.includes('FACEBOOK')) s += 15;
  if (source.includes('WEBSITE')) s += 12;
  if (source.includes('SYNC')) s += 8;
  if (source.includes('IMPORT')) s += 5;

  const status = String(l.status || '').toUpperCase();
  if (status === 'NEW') s += 10;
  if (status === 'CONTACTED') s += 15;
  if (status === 'QUALIFIED') s += 25;
  if (status === 'CONVERTED') s += 40;
  if (status === 'LOST') s -= 30;

  const ageDays = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays <= 1) s += 15;
  else if (ageDays <= 7) s += 8;
  else if (ageDays <= 30) s += 2;

  const p = priorityOf(l);
  if (p === 'HOT') s += 20;
  if (p === 'WARM') s += 10;
  if (p === 'COLD') s += 0;

  return Math.max(0, Math.min(100, s));
}

export function LeadManagementPage() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'source' | 'priority'>('priority');
  const [sortBy, setSortBy] = useState<'score' | 'createdAt' | 'updatedAt'>('score');
  const [page, setPage] = useState(1);
  const listLimit = 20;
  const kanbanLimit = 200;
  const limit = viewMode === 'kanban' ? kanbanLimit : listLimit;

  const [selected, setSelected] = useState<Lead | null>(null);
  const [detailNote, setDetailNote] = useState('');
  const [detailPriority, setDetailPriority] = useState<(typeof priorities)[number]>('NONE');
  const [draggingId, setDraggingId] = useState<string>('');

  const { data: resp, isLoading, error } = useQuery(
    ['leads-management', tenantId, q, status, source, page, limit],
    async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, limit, totalPages: 1 } as LeadsResponse;
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (q) params.append('q', q);
      if (status) params.append('status', status);
      if (source) params.append('source', source);
      const r = await fetch(`${apiUrl}/leads?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!r.ok) throw new Error('Failed to fetch leads');
      return r.json();
    },
    { enabled: !!tenantId },
  );

  const rows = (resp?.data || []) as Lead[];

  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    for (const l of rows) if (l.source) set.add(String(l.source));
    return Array.from(set).sort();
  }, [rows]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const s of statuses) byStatus[s] = 0;
    for (const l of rows) byStatus[String(l.status || 'NEW').toUpperCase()] = (byStatus[String(l.status || 'NEW').toUpperCase()] || 0) + 1;
    const total = rows.length;
    const hot = rows.filter((l) => priorityOf(l) === 'HOT').length;
    const avg = total
      ? Math.round(rows.reduce((sum, l) => sum + (Number(l.score ?? suggestedScore(l)) || 0), 0) / total)
      : 0;
    return { total, hot, avg, byStatus };
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortBy === 'score') {
        const sa = Number(a.score ?? suggestedScore(a)) || 0;
        const sb = Number(b.score ?? suggestedScore(b)) || 0;
        if (sb !== sa) return sb - sa;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return copy;
  }, [rows, sortBy]);

  const groups = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of sorted) {
      let key = 'All';
      if (groupBy === 'status') key = String(l.status || 'NEW').toUpperCase();
      if (groupBy === 'source') key = String(l.source || 'Unknown');
      if (groupBy === 'priority') key = priorityOf(l);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, items: v }));
  }, [sorted, groupBy]);

  const kanbanColumns = useMemo(() => {
    const cols: Array<{ key: string; items: Lead[] }> = [];
    for (const s of statuses) cols.push({ key: s, items: [] });
    const bucket = new Map<string, Lead[]>();
    for (const s of statuses) bucket.set(s, []);
    for (const l of sorted) {
      const st = String(l.status || 'NEW').toUpperCase();
      const k = bucket.has(st) ? st : 'NEW';
      bucket.get(k)!.push(l);
    }
    for (const s of statuses) cols.find((c) => c.key === s)!.items = bucket.get(s)!;
    return cols;
  }, [sorted]);

  const patchLeadMutation = useMutation(
    async (payload: { id: string; data: any }) => {
      const r = await fetch(`${apiUrl}/leads/${payload.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload.data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.message || 'Update failed');
      }
      return r.json();
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['leads-management', tenantId]),
      onError: (e: any) => alert(e?.message || 'Update failed'),
    },
  );

  const openDetail = (l: Lead) => {
    setSelected(l);
    setDetailNote(noteOf(l));
    setDetailPriority(priorityOf(l));
  };

  const saveDetail = () => {
    if (!selected) return;
    const nextMeta = { ...(selected.metadata || {}), note: detailNote, priority: detailPriority === 'NONE' ? undefined : detailPriority };
    patchLeadMutation.mutate({ id: selected.id, data: { metadata: nextMeta } });
    setSelected(null);
  };

  const onCardDragStart = (leadId: string) => (e: React.DragEvent) => {
    setDraggingId(leadId);
    try {
      e.dataTransfer.setData('text/plain', leadId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      // ignore
    }
  };

  const onColumnDrop = (nextStatus: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!leadId) return;
    patchLeadMutation.mutate({ id: leadId, data: { status: nextStatus } });
    setDraggingId('');
  };

  const onColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Lead Management</h1>
          <p className="text-sm text-secondary-text mt-1">จัดกลุ่ม + จัดอันดับ + จัดการ lead ที่เข้ามาจากทุกช่องทาง</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setViewMode('list');
              setPage(1);
              setGroupBy('priority');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list' ? 'bg-primary text-base' : 'bg-background text-secondary-text hover:bg-border'
            }`}
          >
            List
          </button>
          <button
            onClick={() => {
              setViewMode('kanban');
              setPage(1);
              setGroupBy('status');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'kanban' ? 'bg-primary text-base' : 'bg-background text-secondary-text hover:bg-border'
            }`}
          >
            Kanban
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-400">
          <div className="text-sm text-secondary-text mb-1">Leads (this page)</div>
          <div className="text-2xl font-bold text-base">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-rose-400">
          <div className="text-sm text-secondary-text mb-1">HOT</div>
          <div className="text-2xl font-bold text-warning">{stats.hot}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-400">
          <div className="text-sm text-secondary-text mb-1">Avg score</div>
          <div className="text-2xl font-bold text-base">{stats.avg}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-emerald-400">
          <div className="text-sm text-secondary-text mb-1">NEW</div>
          <div className="text-2xl font-bold text-info">{stats.byStatus.NEW || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="name/email/phone/company/title"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
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
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Group / Sort</label>
            <div className="flex gap-2">
              <select className="flex-1 px-3 py-2 border border-border rounded-md" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
                <option value="priority">Group: Priority</option>
                <option value="status">Group: Status</option>
                <option value="source">Group: Source</option>
                <option value="none">No group</option>
              </select>
              <select className="flex-1 px-3 py-2 border border-border rounded-md" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="score">Sort: Score</option>
                <option value="updatedAt">Sort: Updated</option>
                <option value="createdAt">Sort: Created</option>
              </select>
            </div>
            {viewMode === 'kanban' ? (
              <div className="text-xs text-secondary-text mt-2">
                Kanban แสดงล่าสุด {kanbanLimit} รายการ (ลากการ์ดเพื่อเปลี่ยนสถานะ)
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? <div className="mb-4 text-warning text-sm">{String((error as any)?.message || error)}</div> : null}
      {isLoading ? (
        <div className="text-center py-12 text-secondary-text">Loading...</div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => (
            <div
              key={col.key}
              className="bg-white rounded-lg shadow overflow-hidden flex flex-col min-h-[420px]"
              onDrop={onColumnDrop(col.key)}
              onDragOver={onColumnDragOver}
            >
              <div className={`p-4 border-b flex items-center justify-between ${statusHeaderClass(col.key)}`}>
                <div className="font-semibold text-base flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusPillClass(col.key)}`}>
                    {col.key}
                  </span>
                </div>
                <div className="text-sm text-secondary-text">{col.items.length}</div>
              </div>
              <div className="p-3 space-y-3 overflow-y-auto">
                {col.items.map((l) => {
                  const sc = Number(l.score ?? suggestedScore(l));
                  const pr = priorityOf(l);
                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={onCardDragStart(l.id)}
                      className={`border border-border rounded-lg p-3 bg-white hover:bg-background cursor-move ${priorityBorderClass(pr)} ${
                        draggingId === l.id ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-base truncate">{fullName(l)}</div>
                          <div className="text-xs text-secondary-text truncate">
                            {l.company || '-'} {l.source ? `• ${l.source}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{sc}</div>
                          <div className={`text-xs px-2 py-0.5 rounded inline-block border ${priorityPillClass(pr)}`}>{pr}</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-1.5 ${scoreBarClass(sc)}`} style={{ width: `${Math.max(0, Math.min(100, sc))}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openDetail(l)}
                          className="px-3 py-1.5 border border-border rounded-md hover:bg-background text-xs font-medium"
                        >
                          Manage
                        </button>
                        <select
                          className="px-2 py-1.5 border border-border rounded-md text-xs"
                          value={pr}
                          onChange={(e) => {
                            const next = e.target.value as any;
                            const nextMeta = { ...(l.metadata || {}), priority: next === 'NONE' ? undefined : next };
                            patchLeadMutation.mutate({ id: l.id, data: { metadata: nextMeta } });
                          }}
                        >
                          {priorities.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      {noteOf(l) ? (
                        <div className="mt-2 text-xs text-secondary-text line-clamp-2">{noteOf(l)}</div>
                      ) : null}
                    </div>
                  );
                })}
                {col.items.length === 0 ? (
                  <div className="text-sm text-secondary-text text-center py-8">Drop cards here</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="font-semibold text-base">
                  {g.key} <span className="text-secondary-text text-sm">({g.items.length})</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-border">
                    {g.items.map((l) => {
                      const sc = Number(l.score ?? suggestedScore(l));
                      const pr = priorityOf(l);
                      return (
                        <tr key={l.id} className="hover:bg-background">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-base">{fullName(l)}</div>
                            <div className="text-xs text-secondary-text">
                              {l.email || '-'} {l.phone ? `• ${l.phone}` : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{l.company || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{l.source || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              className={`px-2 py-1 border rounded-md text-sm ${statusPillClass(String(l.status || 'NEW'))}`}
                              value={String(l.status || 'NEW').toUpperCase()}
                              onChange={(e) => patchLeadMutation.mutate({ id: l.id, data: { status: e.target.value } })}
                            >
                              {statuses.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              className={`px-2 py-1 border rounded-md text-sm ${priorityPillClass(pr)}`}
                              value={pr}
                              onChange={(e) => {
                                const next = e.target.value as any;
                                const nextMeta = { ...(l.metadata || {}), priority: next === 'NONE' ? undefined : next };
                                patchLeadMutation.mutate({ id: l.id, data: { metadata: nextMeta } });
                              }}
                            >
                              {priorities.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <div className="font-semibold">{sc}</div>
                            <div className="text-xs text-secondary-text">suggested: {suggestedScore(l)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => openDetail(l)}
                              className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {resp && resp.totalPages > 1 && (
            <div className="px-2 py-4 flex items-center justify-between">
              <div className="text-sm text-secondary-text">
                Page {resp.page} of {resp.totalPages} — Total {resp.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={resp.page === 1}
                  className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(resp.totalPages, p + 1))}
                  disabled={resp.page === resp.totalPages}
                  className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">Manage Lead</h2>
                <div className="text-sm text-secondary-text mt-1">{fullName(selected)}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={detailPriority}
                    onChange={(e) => setDetailPriority(e.target.value as any)}
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Score</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      className="w-28 px-3 py-2 border border-border rounded-md"
                      value={Number(selected.score ?? suggestedScore(selected))}
                      onChange={(e) =>
                        patchLeadMutation.mutate({
                          id: selected.id,
                          data: { score: Number(e.target.value) },
                        })
                      }
                    />
                    <button
                      onClick={() => patchLeadMutation.mutate({ id: selected.id, data: { score: suggestedScore(selected) } })}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm font-medium"
                    >
                      Apply suggested
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="Add note for sales follow-up..."
                  value={detailNote}
                  onChange={(e) => setDetailNote(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={saveDetail}
                className="bg-primary text-base px-4 py-2 rounded-md hover:bg-yellow-400"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

