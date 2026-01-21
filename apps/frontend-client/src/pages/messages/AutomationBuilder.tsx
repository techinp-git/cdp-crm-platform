import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type NodeKind = 'START' | 'AUDIENCE' | 'CONDITION' | 'WAIT' | 'OUTPUT';

type BaseNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  data: any;
};

type Edge = {
  id: string;
  from: string;
  to: string;
  label?: string; // e.g. YES/NO for condition
};

type AudienceState =
  | { mode: 'MANUAL'; destinationsText: string }
  | { mode: 'FILTER'; customerType: '' | 'INDIVIDUAL' | 'COMPANY'; tagIds: string[] };

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function kindLabel(kind: NodeKind) {
  if (kind === 'START') return 'Start';
  if (kind === 'AUDIENCE') return 'Audience';
  if (kind === 'CONDITION') return 'Condition';
  if (kind === 'WAIT') return 'Wait';
  return 'Output';
}

function parseDestinations(text: string) {
  return String(text || '')
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function nodeCenter(n: BaseNode) {
  return { x: n.x + 140, y: n.y + 44 };
}

export function AutomationBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const automationId = params.id;
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [name, setName] = useState('New Journey');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('DRAFT');

  const [nodes, setNodes] = useState<BaseNode[]>(() => [
    { id: uid('n'), kind: 'START', x: 120, y: 120, data: {} },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || '');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [connectFromId, setConnectFromId] = useState<string>('');
  const connectFrom = useMemo(() => nodes.find((n) => n.id === connectFromId) || null, [nodes, connectFromId]);
  const [pendingConnect, setPendingConnect] = useState<{ fromId: string; toId: string } | null>(null);
  const [conditionEdgeLabel, setConditionEdgeLabel] = useState<'YES' | 'NO'>('YES');

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const box = canvasRef.current?.getBoundingClientRect();
      if (!box) return;
      const x = e.clientX - box.left - dragRef.current.dx;
      const y = e.clientY - box.top - dragRef.current.dy;
      setNodes((prev) =>
        prev.map((n) => (n.id === dragRef.current?.id ? { ...n, x: clamp(x, 0, box.width - 320), y: clamp(y, 0, box.height - 140) } : n)),
      );
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const definition = useMemo(() => {
    const startNodeId = nodes.find((n) => n.kind === 'START')?.id || nodes[0]?.id;
    return {
      version: 1,
      kind: 'MESSAGE_AUTOMATION',
      startNodeId,
      nodes,
      edges,
    };
  }, [edges, nodes]);

  const tagsQuery = useQuery(
    ['automation-tags', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/tags`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) return [];
      const body = await res.json().catch(() => []);
      return Array.isArray(body) ? body : [];
    },
    { enabled: !!tenantId },
  );
  const tags: Array<{ id: string; name: string; color?: string }> = (tagsQuery.data as any) || [];

  const loadQuery = useQuery(
    ['automation', tenantId, automationId],
    async () => {
      const res = await fetch(`${apiUrl}/messages/automations/${automationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load automation');
      return body as any;
    },
    { enabled: !!tenantId && !!automationId },
  );

  useEffect(() => {
    if (!loadQuery.data) return;
    const a = loadQuery.data as any;
    setName(a.name || 'Journey');
    setDescription(a.description || '');
    setStatus((a.status || 'DRAFT') as any);
    const def = a.definition || null;
    if (def?.kind === 'MESSAGE_AUTOMATION' && Array.isArray(def.nodes)) {
      setNodes(def.nodes);
      setEdges(Array.isArray(def.edges) ? def.edges : []);
      setSelectedNodeId(def.nodes[0]?.id || '');
      setSelectedEdgeId('');
    }
  }, [loadQuery.data?.id]);

  const saveMutation = useMutation(async () => {
    const payload = {
      name: name.trim() || 'New Journey',
      description: description.trim() || undefined,
      status,
      definition,
    };
    const res = await fetch(automationId ? `${apiUrl}/messages/automations/${automationId}` : `${apiUrl}/messages/automations`, {
      method: automationId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || 'Save failed');
    return body;
  });

  const addNode = (kind: NodeKind) => {
    const box = canvasRef.current?.getBoundingClientRect();
    const x = box ? 60 + Math.random() * Math.max(20, box.width - 380) : 220;
    const y = box ? 80 + Math.random() * Math.max(20, box.height - 220) : 140;
    const n: BaseNode = {
      id: uid('n'),
      kind,
      x,
      y,
      data:
        kind === 'AUDIENCE'
          ? ({ mode: 'FILTER', customerType: '', tagIds: [] } as AudienceState)
          : kind === 'CONDITION'
            ? ({ conditions: [{ field: 'tag', op: 'HAS', value: '' }] } as any)
            : kind === 'WAIT'
              ? ({ amount: 1, unit: 'days' } as any)
              : kind === 'OUTPUT'
                ? ({ channel: 'LINE', templateId: '' } as any)
                : ({} as any),
    };
    setNodes((prev) => [...prev, n]);
    setSelectedNodeId(n.id);
    setSelectedEdgeId('');
  };

  const removeSelected = () => {
    if (selectedEdge) {
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdgeId('');
      return;
    }
    if (!selectedNode) return;
    if (selectedNode.kind === 'START') return;
    if (nodes.length <= 1) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) => prev.filter((e) => e.from !== selectedNode.id && e.to !== selectedNode.id));
    setSelectedNodeId(nodes.find((n) => n.id !== selectedNode.id)?.id || '');
    setSelectedEdgeId('');
  };

  const startConnect = () => {
    if (!selectedNode) return;
    setConnectFromId(selectedNode.id);
  };

  const finishConnectTo = (targetId: string) => {
    if (!connectFrom) return;
    if (targetId === connectFrom.id) return;
    const to = nodes.find((n) => n.id === targetId);
    if (!to) return;
    // Condition edge needs label
    if (connectFrom.kind === 'CONDITION') {
      setPendingConnect({ fromId: connectFrom.id, toId: targetId });
      setConditionEdgeLabel('YES');
    } else {
      const edge: Edge = { id: uid('e'), from: connectFrom.id, to: targetId };
      setEdges((prev) => [...prev, edge]);
      setSelectedEdgeId(edge.id);
      setSelectedNodeId('');
    }
    setConnectFromId('');
  };

  const createConditionEdge = () => {
    if (!pendingConnect) return;
    const edge: Edge = { id: uid('e'), from: pendingConnect.fromId, to: pendingConnect.toId, label: conditionEdgeLabel };
    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId('');
    setPendingConnect(null);
  };

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Auto Marketing / Journey</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-4">
      {/* Palette */}
      <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-semibold">Auto Marketing / Journey</div>
          <div className="text-xs text-secondary-text mt-1">สร้าง flow ด้วย node: Start, Audience, Condition, Wait, Output</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Link to="/messages/automation" className="text-sm text-primary font-medium">
              ← Back to list
            </Link>
            {automationId ? <div className="text-xs text-secondary-text font-mono">ID: {automationId}</div> : null}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="w-full px-3 py-2 border border-border rounded-md text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full px-3 py-2 border border-border rounded-md text-sm h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full px-3 py-2 border border-border rounded-md text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="text-sm font-medium mb-2">Nodes</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addNode('AUDIENCE')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Audience
              </button>
              <button onClick={() => addNode('CONDITION')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Condition
              </button>
              <button onClick={() => addNode('WAIT')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Wait
              </button>
              <button onClick={() => addNode('OUTPUT')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Output
              </button>
            </div>
            <div className="text-xs text-secondary-text mt-2">Start node ถูกสร้างให้แล้ว (ลบไม่ได้)</div>
          </div>

          <div className="pt-2 border-t border-border flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
              className="flex-1 px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
            >
              {saveMutation.isLoading ? 'Saving...' : automationId ? 'Save Changes' : 'Save Journey'}
            </button>
            <button onClick={removeSelected} className="px-4 py-2 border border-border rounded-md hover:bg-background" title="Delete selected">
              Delete
            </button>
          </div>

          {saveMutation.isError ? (
            <div className="p-3 bg-error/10 text-error rounded-md text-sm">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}
            </div>
          ) : null}
          {saveMutation.isSuccess ? (
            <div className="p-3 bg-success/10 text-success rounded-md text-sm">
              Saved.
              {!automationId && (saveMutation.data as any)?.id ? (
                <button className="ml-2 underline" onClick={() => navigate(`/messages/automation/${(saveMutation.data as any).id}`)}>
                  Open
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Canvas */}
      <div className="col-span-12 lg:col-span-6 bg-white rounded-lg shadow overflow-hidden relative">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold">Canvas</div>
          <div className="text-xs text-secondary-text">
            {connectFrom ? `Select target for: ${kindLabel(connectFrom.kind)}` : 'Tip: select node → Connect → click target node'}
          </div>
        </div>
        <div ref={canvasRef} className="relative w-full h-[calc(100%-3.5rem)] bg-background overflow-hidden">
          <svg className="absolute inset-0 w-full h-full">
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const a = nodeCenter(from);
              const b = nodeCenter(to);
              const active = selectedEdgeId === e.id;
              return (
                <g
                  key={e.id}
                  onClick={() => {
                    setSelectedEdgeId(e.id);
                    setSelectedNodeId('');
                  }}
                >
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? '#F59E0B' : '#9CA3AF'} strokeWidth={active ? 3 : 2} />
                  {e.label ? (
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} fontSize="10" fill={active ? '#B45309' : '#6B7280'}>
                      {e.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {nodes.map((n) => {
            const active = selectedNodeId === n.id;
            const accent =
              n.kind === 'START'
                ? 'bg-green-50'
                : n.kind === 'AUDIENCE'
                  ? 'bg-blue-50'
                  : n.kind === 'CONDITION'
                    ? 'bg-purple-50'
                    : n.kind === 'WAIT'
                      ? 'bg-orange-50'
                      : 'bg-yellow-50';

            return (
              <div
                key={n.id}
                className={`absolute w-72 rounded-lg border shadow-sm ${active ? 'border-yellow-500' : 'border-border'} bg-white`}
                style={{ left: n.x, top: n.y }}
                onMouseDown={(e) => {
                  setSelectedNodeId(n.id);
                  setSelectedEdgeId('');
                  if (connectFrom) {
                    e.stopPropagation();
                    finishConnectTo(n.id);
                    return;
                  }
                }}
              >
                <div
                  className={`px-3 py-2 border-b border-border flex items-center justify-between cursor-move ${active ? accent : ''}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const box = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                    dragRef.current = { id: n.id, dx: e.clientX - box.left, dy: e.clientY - box.top };
                  }}
                >
                  <div className="text-sm font-semibold truncate">{kindLabel(n.kind)}</div>
                  <div className="text-xs text-secondary-text font-mono">{n.id.slice(-6)}</div>
                </div>
                <div className="px-3 py-2 text-xs text-secondary-text">
                  {n.kind === 'AUDIENCE' ? (
                    <div className="flex items-center justify-between">
                      <span>Audience</span>
                      <span className="font-mono">{String(n.data?.mode || '').toUpperCase() || '—'}</span>
                    </div>
                  ) : n.kind === 'CONDITION' ? (
                    <div className="flex items-center justify-between">
                      <span>Conditions</span>
                      <span className="font-mono">{Array.isArray(n.data?.conditions) ? n.data.conditions.length : 0}</span>
                    </div>
                  ) : n.kind === 'WAIT' ? (
                    <div className="flex items-center justify-between">
                      <span>Wait</span>
                      <span className="font-mono">
                        {n.data?.amount ?? 1} {n.data?.unit || 'days'}
                      </span>
                    </div>
                  ) : n.kind === 'OUTPUT' ? (
                    <div className="flex items-center justify-between">
                      <span>Output</span>
                      <span className="font-mono">{n.data?.channel || '—'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>Start</span>
                      <span className="font-mono">1</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector */}
      <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-semibold">Inspector</div>
          <div className="text-xs text-secondary-text mt-1">ตั้งค่า node + connect</div>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="border border-border rounded-lg p-3">
                <div className="text-sm font-semibold">{kindLabel(selectedNode.kind)}</div>
                <div className="text-xs text-secondary-text mt-1">Select node แล้วกด Connect เพื่อเชื่อมไป node ถัดไป</div>
              </div>

              {selectedNode.kind === 'AUDIENCE' ? (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Audience</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { mode: 'FILTER', customerType: '', tagIds: [] } } : n)),
                        )
                      }
                      className={`px-3 py-2 rounded-md text-sm font-medium ${String(selectedNode.data?.mode).toUpperCase() === 'FILTER' ? 'bg-primary text-base' : 'bg-background'}`}
                    >
                      Filter
                    </button>
                    <button
                      onClick={() =>
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { mode: 'MANUAL', destinationsText: '' } } : n)))
                      }
                      className={`px-3 py-2 rounded-md text-sm font-medium ${String(selectedNode.data?.mode).toUpperCase() === 'MANUAL' ? 'bg-primary text-base' : 'bg-background'}`}
                    >
                      Manual
                    </button>
                  </div>

                  {String(selectedNode.data?.mode).toUpperCase() === 'MANUAL' ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">Destinations (line / comma)</label>
                      <textarea
                        className="w-full px-3 py-2 border border-border rounded-md text-sm h-28"
                        value={selectedNode.data?.destinationsText || ''}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, destinationsText: e.target.value } } : n)),
                          )
                        }
                      />
                      <div className="text-xs text-secondary-text mt-1">
                        Count: <span className="font-mono">{parseDestinations(selectedNode.data?.destinationsText || '').length}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Customer type</label>
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          value={selectedNode.data?.customerType || ''}
                          onChange={(e) =>
                            setNodes((prev) =>
                              prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, customerType: e.target.value } } : n)),
                            )
                          }
                        >
                          <option value="">All</option>
                          <option value="INDIVIDUAL">INDIVIDUAL</option>
                          <option value="COMPANY">COMPANY</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Tags</div>
                        <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                          {tags.length ? (
                            tags.map((t) => {
                              const tagIds: string[] = Array.isArray(selectedNode.data?.tagIds) ? selectedNode.data.tagIds : [];
                              const checked = tagIds.includes(t.id);
                              return (
                                <label key={t.id} className="flex items-center gap-2 text-sm mb-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked ? Array.from(new Set([...tagIds, t.id])) : tagIds.filter((x) => x !== t.id);
                                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, tagIds: next } } : n)));
                                    }}
                                  />
                                  <span className="inline-flex items-center gap-2">
                                    <span className="w-3 h-3 rounded" style={{ backgroundColor: t.color || '#9CA3AF' }} />
                                    <span>{t.name}</span>
                                  </span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="text-sm text-secondary-text">No tags</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {selectedNode.kind === 'CONDITION' ? (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Condition</div>
                    <button
                      className="px-2 py-1 text-xs border border-border rounded hover:bg-background"
                      onClick={() => {
                        const conds = Array.isArray(selectedNode.data?.conditions) ? selectedNode.data.conditions : [];
                        const next = [...conds, { field: 'tag', op: 'HAS', value: '' }];
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, conditions: next } } : n)));
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {(Array.isArray(selectedNode.data?.conditions) ? selectedNode.data.conditions : []).map((c: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        className="col-span-4 px-2 py-1 border border-border rounded text-xs"
                        value={c.field}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    data: {
                                      ...n.data,
                                      conditions: n.data.conditions.map((x: any, i: number) => (i === idx ? { ...x, field: v } : x)),
                                    },
                                  }
                                : n,
                            ),
                          );
                        }}
                      >
                        <option value="tag">tag</option>
                        <option value="event">event</option>
                        <option value="customerType">customerType</option>
                      </select>
                      <select
                        className="col-span-3 px-2 py-1 border border-border rounded text-xs"
                        value={c.op}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    data: {
                                      ...n.data,
                                      conditions: n.data.conditions.map((x: any, i: number) => (i === idx ? { ...x, op: v } : x)),
                                    },
                                  }
                                : n,
                            ),
                          );
                        }}
                      >
                        <option value="HAS">HAS</option>
                        <option value="EQUALS">EQUALS</option>
                        <option value="CONTAINS">CONTAINS</option>
                      </select>
                      <input
                        className="col-span-4 px-2 py-1 border border-border rounded text-xs"
                        value={c.value}
                        placeholder="value"
                        onChange={(e) => {
                          const v = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    data: {
                                      ...n.data,
                                      conditions: n.data.conditions.map((x: any, i: number) => (i === idx ? { ...x, value: v } : x)),
                                    },
                                  }
                                : n,
                            ),
                          );
                        }}
                      />
                      <button
                        className="col-span-1 text-xs text-secondary-text hover:text-base"
                        onClick={() => {
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, data: { ...n.data, conditions: n.data.conditions.filter((_: any, i: number) => i !== idx) } }
                                : n,
                            ),
                          );
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div className="text-xs text-secondary-text">
                    Tip: ถ้าเชื่อมออกจาก Condition จะให้เลือก label YES/NO บนเส้น
                  </div>
                </div>
              ) : null}

              {selectedNode.kind === 'WAIT' ? (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Wait</div>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="number"
                      className="col-span-5 px-3 py-2 border border-border rounded-md text-sm"
                      value={Number(selectedNode.data?.amount || 1)}
                      min={1}
                      onChange={(e) =>
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, amount: Number(e.target.value) } } : n)))
                      }
                    />
                    <select
                      className="col-span-7 px-3 py-2 border border-border rounded-md text-sm"
                      value={selectedNode.data?.unit || 'days'}
                      onChange={(e) =>
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, unit: e.target.value } } : n)))
                      }
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {selectedNode.kind === 'OUTPUT' ? (
                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Output</div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Channel</label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                      value={selectedNode.data?.channel || 'LINE'}
                      onChange={(e) =>
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, channel: e.target.value, templateId: '' } } : n)))
                      }
                    >
                      <option value="LINE">LINE</option>
                      <option value="MESSENGER">MESSENGER</option>
                      <option value="EMAIL">EMAIL</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Template ID</label>
                    <input
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                      placeholder="templateId (will be used when executing)"
                      value={selectedNode.data?.templateId || ''}
                      onChange={(e) =>
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, templateId: e.target.value } } : n)))
                      }
                    />
                    <div className="text-xs text-secondary-text mt-1">ตอนนี้เก็บ definition ก่อน (ยังไม่ execute จริง)</div>
                  </div>
                </div>
              ) : null}

              <div className="border border-border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Connect</div>
                <button onClick={startConnect} className="w-full px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/80">
                  Connect →
                </button>
                <div className="text-xs text-secondary-text mt-2">หลังจากกด Connect ให้คลิก node ปลายทางใน canvas</div>
              </div>
            </>
          ) : selectedEdge ? (
            <div className="border border-border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Edge</div>
              <div className="text-xs text-secondary-text mb-3">Click line to select. Delete to remove.</div>
              <div className="text-sm font-mono bg-background border border-border rounded p-2">
                {selectedEdge.from.slice(-6)} → {selectedEdge.to.slice(-6)} {selectedEdge.label ? `(${selectedEdge.label})` : ''}
              </div>
            </div>
          ) : (
            <div className="text-sm text-secondary-text">Select a node (or line) in the canvas.</div>
          )}

          <div className="border border-border rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Definition (saved)</div>
            <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-72">{JSON.stringify(definition, null, 2)}</pre>
          </div>
        </div>
      </div>

      {/* Condition edge modal */}
      {pendingConnect ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-lg font-semibold">Condition branch</div>
                <div className="text-sm text-secondary-text">เลือก label ให้ edge ออกจาก Condition</div>
              </div>
              <button className="text-secondary-text hover:text-base" onClick={() => setPendingConnect(null)}>
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={conditionEdgeLabel === 'YES'} onChange={() => setConditionEdgeLabel('YES')} /> YES
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={conditionEdgeLabel === 'NO'} onChange={() => setConditionEdgeLabel('NO')} /> NO
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setPendingConnect(null)} className="px-4 py-2 border border-border rounded-md hover:bg-background">
                Cancel
              </button>
              <button onClick={createConditionEdge} className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

