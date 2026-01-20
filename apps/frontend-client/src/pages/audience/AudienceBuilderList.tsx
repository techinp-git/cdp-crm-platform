import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type SegmentRow = {
  id: string;
  name: string;
  description?: string | null;
  definition: any;
  isDynamic: boolean;
  createdAt: string;
  updatedAt: string;
};

function extractStats(definition: any): { nodes: number; edges: number } {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes.length : 0;
  const edges = Array.isArray(definition?.edges) ? definition.edges.length : 0;
  return { nodes, edges };
}

export function AudienceBuilderListPage() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [q, setQ] = useState('');

  const listQuery = useQuery(
    ['segments', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/segments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load segments');
      return (Array.isArray(body) ? body : []) as SegmentRow[];
    },
    { enabled: !!tenantId },
  );

  const rows = useMemo(() => {
    const all = listQuery.data || [];
    const filtered = all.filter((s) => String(s?.definition?.kind || '') === 'AUDIENCE_BUILDER');
    if (!q.trim()) return filtered;
    const qq = q.trim().toLowerCase();
    return filtered.filter((s) => String(s.name || '').toLowerCase().includes(qq) || String(s.description || '').toLowerCase().includes(qq));
  }, [listQuery.data, q]);

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Audience Builder</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (listQuery.isLoading) return <div className="text-center py-12">Loading...</div>;
  if (listQuery.isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Audience Builder</div>
        <div className="text-sm text-error">{(listQuery.error as any)?.message || 'Failed to load'}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Audience Builder</h1>
          <p className="text-sm text-secondary-text mt-1">สร้าง audience แบบลาก-วาด join แล้วบันทึกเป็น segment</p>
        </div>
        <Link to="/audience/builder/new" className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
          + New Audience
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Name or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="text-sm text-secondary-text">
            Total: <span className="font-medium text-base">{rows.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Audiences</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Graph</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {rows.length ? (
                rows.map((s) => {
                  const st = extractStats(s.definition);
                  return (
                    <tr key={s.id} className="hover:bg-background">
                      <td className="px-6 py-4">
                        <div className="font-medium text-base">{s.name}</div>
                        <div className="text-xs text-secondary-text mt-1">{s.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-text">
                        {st.nodes} nodes • {st.edges} joins
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-text">{new Date(s.updatedAt).toLocaleString('th-TH')}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/audience/builder/${s.id}`} className="px-3 py-2 border border-border rounded-md hover:bg-background text-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-secondary-text">
                    No audiences yet. Click “New Audience”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

