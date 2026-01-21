import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type NodeKind = 'CUSTOMERS' | 'BILLINGS' | 'EVENTS' | 'CUSTOMER_TAGS';

type BuilderNode = {
  id: string;
  kind: NodeKind;
  alias: string;
  x: number;
  y: number;
  filters: Array<{ field: string; op: string; value: string }>;
};

type BuilderEdge = {
  id: string;
  from: string; // nodeId
  to: string; // nodeId
  on: Array<{ leftField: string; op: '=' | '!='; rightField: string }>;
};

type JoinDraft = {
  from: BuilderNode;
  to: BuilderNode;
  leftField: string;
  rightField: string;
  op: '=' | '!=';
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function kindLabel(kind: NodeKind) {
  if (kind === 'CUSTOMERS') return 'Customers';
  if (kind === 'BILLINGS') return 'Billings';
  if (kind === 'EVENTS') return 'Events';
  return 'CustomerTags';
}

function fieldsFor(kind: NodeKind): Array<{ key: string; label: string }> {
  if (kind === 'CUSTOMERS') {
    return [
      { key: 'id', label: 'customer.id' },
      { key: 'type', label: 'customer.type' },
      { key: 'identifiers.email', label: 'identifiers.email' },
      { key: 'identifiers.phone', label: 'identifiers.phone' },
      { key: 'identifiers.lineUserId', label: 'identifiers.lineUserId' },
      { key: 'identifiers.psid', label: 'identifiers.psid' },
      { key: 'profile.name', label: 'profile.name' },
      { key: 'profile.companyName', label: 'profile.companyName' },
    ];
  }
  if (kind === 'BILLINGS') {
    return [
      { key: 'id', label: 'billing.id' },
      { key: 'customerId', label: 'billing.customerId' },
      { key: 'invoiceNumber', label: 'billing.invoiceNumber' },
      { key: 'status', label: 'billing.status' },
      { key: 'issueDate', label: 'billing.issueDate' },
      { key: 'paidDate', label: 'billing.paidDate' },
      { key: 'amount', label: 'billing.amount' },
      { key: 'currency', label: 'billing.currency' },
    ];
  }
  if (kind === 'EVENTS') {
    return [
      { key: 'id', label: 'event.id' },
      { key: 'customerId', label: 'event.customerId' },
      { key: 'type', label: 'event.type' },
      { key: 'timestamp', label: 'event.timestamp' },
      { key: 'payload.utm_source', label: 'payload.utm_source' },
      { key: 'payload.source', label: 'payload.source' },
    ];
  }
  // CUSTOMER_TAGS
  return [
    { key: 'customerId', label: 'customerTag.customerId' },
    { key: 'tagId', label: 'customerTag.tagId' },
    { key: 'createdAt', label: 'customerTag.createdAt' },
  ];
}

function nodeTitle(n: BuilderNode) {
  return `${kindLabel(n.kind)} • ${n.alias}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AudienceBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const segmentId = params.id;
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [name, setName] = useState('New Audience');
  const [description, setDescription] = useState('');

  const [nodes, setNodes] = useState<BuilderNode[]>(() => [
    { id: uid('n'), kind: 'CUSTOMERS', alias: 'c', x: 220, y: 120, filters: [] },
  ]);
  const [edges, setEdges] = useState<BuilderEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || '');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [connectFromId, setConnectFromId] = useState<string>('');
  const connectFrom = useMemo(() => nodes.find((n) => n.id === connectFromId) || null, [nodes, connectFromId]);

  const [joinDraft, setJoinDraft] = useState<JoinDraft | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const box = canvasRef.current?.getBoundingClientRect();
      if (!box) return;
      const x = e.clientX - box.left - dragRef.current.dx;
      const y = e.clientY - box.top - dragRef.current.dy;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragRef.current?.id
            ? { ...n, x: clamp(x, 0, box.width - 240), y: clamp(y, 0, box.height - 140) }
            : n,
        ),
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
    return {
      version: 1,
      kind: 'AUDIENCE_BUILDER',
      root: nodes.find((n) => n.kind === 'CUSTOMERS')?.id || nodes[0]?.id,
      nodes,
      edges,
    };
  }, [nodes, edges]);

  const loadQuery = useQuery(
    ['segment', tenantId, segmentId],
    async () => {
      const res = await fetch(`${apiUrl}/segments/${segmentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load segment');
      return body as any;
    },
    { enabled: !!tenantId && !!segmentId },
  );

  useEffect(() => {
    if (!loadQuery.data) return;
    const seg = loadQuery.data as any;
    if (seg?.definition?.kind !== 'AUDIENCE_BUILDER') return;
    setName(seg.name || 'Audience');
    setDescription(seg.description || '');
    const nextNodes = Array.isArray(seg.definition?.nodes) ? seg.definition.nodes : [];
    const nextEdges = Array.isArray(seg.definition?.edges) ? seg.definition.edges : [];
    if (nextNodes.length) {
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(nextNodes[0]?.id || '');
      setSelectedEdgeId('');
    }
  }, [loadQuery.data?.id]);

  const saveMutation = useMutation(async () => {
    const payload = {
      name: name.trim() || 'New Audience',
      description: description.trim() || undefined,
      definition,
      isDynamic: true,
    };
    const res = await fetch(segmentId ? `${apiUrl}/segments/${segmentId}` : `${apiUrl}/segments`, {
      method: segmentId ? 'PATCH' : 'POST',
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
    const x = box ? 60 + Math.random() * Math.max(20, box.width - 320) : 200;
    const y = box ? 80 + Math.random() * Math.max(20, box.height - 220) : 140;
    const aliasBase = kind === 'CUSTOMERS' ? 'c' : kind === 'BILLINGS' ? 'b' : kind === 'EVENTS' ? 'e' : 'ct';
    const alias = `${aliasBase}${nodes.filter((n) => n.kind === kind).length + 1}`;
    const n: BuilderNode = { id: uid('n'), kind, alias, x, y, filters: [] };
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
    if (selectedNode) {
      // Keep at least one node
      if (nodes.length <= 1) return;
      setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
      setEdges((prev) => prev.filter((e) => e.from !== selectedNode.id && e.to !== selectedNode.id));
      setSelectedNodeId(nodes.find((n) => n.id !== selectedNode.id)?.id || '');
      setSelectedEdgeId('');
    }
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

    // Default join suggestions
    const left = connectFrom.kind === 'CUSTOMERS' ? 'id' : connectFrom.kind === 'BILLINGS' ? 'customerId' : connectFrom.kind === 'EVENTS' ? 'customerId' : 'customerId';
    const right = to.kind === 'CUSTOMERS' ? 'id' : to.kind === 'BILLINGS' ? 'customerId' : to.kind === 'EVENTS' ? 'customerId' : 'customerId';

    setJoinDraft({ from: connectFrom, to, leftField: left, rightField: right, op: '=' });
    setConnectFromId('');
  };

  const createEdgeFromDraft = () => {
    if (!joinDraft) return;
    const edge: BuilderEdge = {
      id: uid('e'),
      from: joinDraft.from.id,
      to: joinDraft.to.id,
      on: [{ leftField: joinDraft.leftField, op: joinDraft.op, rightField: joinDraft.rightField }],
    };
    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId('');
    setJoinDraft(null);
  };

  const nodeCenter = (n: BuilderNode) => ({ x: n.x + 120, y: n.y + 40 });

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Audience Builder</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-4">
      {/* Palette */}
      <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-semibold">Audience Builder</div>
          <div className="text-xs text-secondary-text mt-1">ลาก node ลง canvas แล้วเชื่อมเส้นเพื่อ join</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Link to="/audience/builder" className="text-sm text-primary font-medium">
              ← Back to list
            </Link>
            {segmentId ? <div className="text-xs text-secondary-text font-mono">ID: {segmentId}</div> : null}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="w-full px-3 py-2 border border-border rounded-md text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md text-sm h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-sm font-medium mb-2">Data Sources</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addNode('CUSTOMERS')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Customers
              </button>
              <button onClick={() => addNode('BILLINGS')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Billings
              </button>
              <button onClick={() => addNode('EVENTS')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + Events
              </button>
              <button onClick={() => addNode('CUSTOMER_TAGS')} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                + CustomerTags
              </button>
            </div>
            <div className="text-xs text-secondary-text mt-2">
              Join ที่พบบ่อย: Customers.id = Billings.customerId, Customers.id = Events.customerId
            </div>
          </div>

          <div className="pt-2 border-t border-border flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
              className="flex-1 px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
            >
              {saveMutation.isLoading ? 'Saving...' : segmentId ? 'Save Changes' : 'Save Segment'}
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
              {!segmentId && (saveMutation.data as any)?.id ? (
                <button
                  className="ml-2 underline"
                  onClick={() => navigate(`/audience/builder/${(saveMutation.data as any).id}`)}
                >
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
            {connectFrom ? `Select target to join with: ${nodeTitle(connectFrom)}` : 'Tip: select node → Connect → click target node'}
          </div>
        </div>
        <div ref={canvasRef} className="relative w-full h-[calc(100%-3.5rem)] bg-background overflow-hidden">
          {/* edges */}
          <svg className="absolute inset-0 w-full h-full">
            {edges.map((e) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const a = nodeCenter(from);
              const b = nodeCenter(to);
              const active = selectedEdgeId === e.id;
              return (
                <g key={e.id} onClick={() => { setSelectedEdgeId(e.id); setSelectedNodeId(''); }}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? '#F59E0B' : '#9CA3AF'} strokeWidth={active ? 3 : 2} />
                </g>
              );
            })}
          </svg>

          {/* nodes */}
          {nodes.map((n) => {
            const active = selectedNodeId === n.id;
            return (
              <div
                key={n.id}
                className={`absolute w-60 rounded-lg border shadow-sm ${active ? 'border-yellow-500' : 'border-border'} bg-white`}
                style={{ left: n.x, top: n.y }}
                onMouseDown={(e) => {
                  // select
                  setSelectedNodeId(n.id);
                  setSelectedEdgeId('');
                  if (connectFrom) {
                    // click target node while connecting
                    e.stopPropagation();
                    finishConnectTo(n.id);
                    return;
                  }
                }}
              >
                <div
                  className={`px-3 py-2 border-b border-border flex items-center justify-between cursor-move ${active ? 'bg-yellow-50' : ''}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const box = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                    dragRef.current = { id: n.id, dx: e.clientX - box.left, dy: e.clientY - box.top };
                  }}
                >
                  <div className="text-sm font-semibold truncate">{kindLabel(n.kind)}</div>
                  <div className="text-xs text-secondary-text font-mono">{n.alias}</div>
                </div>
                <div className="px-3 py-2 text-xs text-secondary-text">
                  <div className="flex items-center justify-between">
                    <span>Filters</span>
                    <span className="font-mono">{n.filters.length}</span>
                  </div>
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
          <div className="text-xs text-secondary-text mt-1">ตั้งค่า join + filter</div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="border border-border rounded-lg p-3">
                <div className="text-sm font-semibold">{nodeTitle(selectedNode)}</div>
                <div className="text-xs text-secondary-text mt-1">Drag node in canvas to arrange</div>
              </div>

              <div className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Filters</div>
                  <button
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-background"
                    onClick={() => {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id ? { ...n, filters: [...n.filters, { field: '', op: '=', value: '' }] } : n,
                        ),
                      );
                    }}
                  >
                    + Add
                  </button>
                </div>
                {selectedNode.filters.length === 0 ? (
                  <div className="text-xs text-secondary-text">No filters</div>
                ) : (
                  <div className="space-y-2">
                    {selectedNode.filters.map((f, idx) => {
                      const options = fieldsFor(selectedNode.kind);
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <select
                            className="col-span-5 px-2 py-1 border border-border rounded text-xs"
                            value={f.field}
                            onChange={(e) => {
                              const v = e.target.value;
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id === selectedNode.id
                                    ? {
                                        ...n,
                                        filters: n.filters.map((x, i) => (i === idx ? { ...x, field: v } : x)),
                                      }
                                    : n,
                                ),
                              );
                            }}
                          >
                            <option value="">Field</option>
                            {options.map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="col-span-2 px-2 py-1 border border-border rounded text-xs"
                            value={f.op}
                            onChange={(e) => {
                              const v = e.target.value;
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id === selectedNode.id
                                    ? { ...n, filters: n.filters.map((x, i) => (i === idx ? { ...x, op: v } : x)) }
                                    : n,
                                ),
                              );
                            }}
                          >
                            <option value="=">=</option>
                            <option value="!=">!=</option>
                            <option value="contains">contains</option>
                            <option value="gt">&gt;</option>
                            <option value="lt">&lt;</option>
                          </select>
                          <input
                            className="col-span-4 px-2 py-1 border border-border rounded text-xs"
                            value={f.value}
                            placeholder="value"
                            onChange={(e) => {
                              const v = e.target.value;
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id === selectedNode.id
                                    ? { ...n, filters: n.filters.map((x, i) => (i === idx ? { ...x, value: v } : x)) }
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
                                  n.id === selectedNode.id ? { ...n, filters: n.filters.filter((_, i) => i !== idx) } : n,
                                ),
                              );
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border border-border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Joins</div>
                <button
                  onClick={startConnect}
                  className="w-full px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/80"
                >
                  Connect (Join)
                </button>
                <div className="text-xs text-secondary-text mt-2">หลังจากกด Connect ให้คลิก node ปลายทางใน canvas</div>
              </div>
            </>
          ) : selectedEdge ? (
            <div className="border border-border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Join</div>
              <div className="text-xs text-secondary-text mb-3">Click line to select. Delete to remove.</div>
              {selectedEdge.on.map((c, idx) => (
                <div key={idx} className="text-sm font-mono bg-background border border-border rounded p-2 mb-2">
                  {c.leftField} {c.op} {c.rightField}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-secondary-text">Select a node (or join line) in the canvas.</div>
          )}

          <div className="border border-border rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Definition (saved to Segment)</div>
            <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-72">
              {JSON.stringify(definition, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Join modal */}
      {joinDraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-lg font-semibold">Create Join</div>
                <div className="text-sm text-secondary-text">
                  {nodeTitle(joinDraft.from)} ↔ {nodeTitle(joinDraft.to)}
                </div>
              </div>
              <button className="text-secondary-text hover:text-base" onClick={() => setJoinDraft(null)}>
                ✕
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-sm font-medium mb-1">Left field</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={joinDraft.leftField}
                  onChange={(e) => setJoinDraft((d) => (d ? { ...d, leftField: e.target.value } : d))}
                >
                  {fieldsFor(joinDraft.from.kind).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Op</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={joinDraft.op}
                  onChange={(e) => setJoinDraft((d) => (d ? { ...d, op: e.target.value as any } : d))}
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                </select>
              </div>
              <div className="col-span-5">
                <label className="block text-sm font-medium mb-1">Right field</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={joinDraft.rightField}
                  onChange={(e) => setJoinDraft((d) => (d ? { ...d, rightField: e.target.value } : d))}
                >
                  {fieldsFor(joinDraft.to.kind).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background border border-border rounded-md text-sm font-mono">
              {joinDraft.leftField} {joinDraft.op} {joinDraft.rightField}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setJoinDraft(null)} className="px-4 py-2 border border-border rounded-md hover:bg-background">
                Cancel
              </button>
              <button onClick={createEdgeFromDraft} className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
                Create Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

