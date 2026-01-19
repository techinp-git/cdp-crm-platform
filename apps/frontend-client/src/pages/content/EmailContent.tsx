import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type EmailContent = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: Status;
  content: any;
  updatedAt: string;
  createdAt: string;
};

type EmailPayload = {
  subject: string;
  preheader?: string;
  html?: string;
  text?: string;
};

function clampText(s: string, n: number) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function EmailContentPage() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editing, setEditing] = useState<EmailContent | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');

  const [form, setForm] = useState({ name: '', description: '', status: 'DRAFT' as Status });
  const [payload, setPayload] = useState<EmailPayload>({
    subject: '',
    preheader: '',
    html: '',
    text: '',
  });

  const queryKey = useMemo(
    () => ['email-contents', tenantId, currentPage, limit, q, status],
    [tenantId, currentPage, limit, q, status],
  );

  const { data: listResponse, isLoading, isError, error } = useQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);

      const res = await fetch(`${apiUrl}/email-contents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to fetch Email contents (HTTP ${res.status})`);
      }
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const items: EmailContent[] = listResponse?.data || [];
  const totalPages: number = listResponse?.totalPages || 1;
  const total: number = listResponse?.total || 0;

  const upsertMutation = useMutation(
    async () => {
      const content = {
        subject: payload.subject,
        preheader: payload.preheader || undefined,
        html: payload.html || undefined,
        text: payload.text || undefined,
      };
      const dto = {
        name: form.name,
        description: form.description || undefined,
        type: 'EMAIL',
        status: form.status,
        content,
      };

      const url = editing ? `${apiUrl}/email-contents/${editing.id}` : `${apiUrl}/email-contents`;
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(dto),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Save failed');
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['email-contents']);
        setMode('list');
        setEditing(null);
        setForm({ name: '', description: '', status: 'DRAFT' });
        setPayload({ subject: '', preheader: '', html: '', text: '' });
      },
    },
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/email-contents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Delete failed');
      return data;
    },
    { onSuccess: () => queryClient.invalidateQueries(['email-contents']) },
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'DRAFT' });
    setPayload({
      subject: '',
      preheader: '',
      html: '<div style="font-family: Arial, sans-serif; font-size: 14px;">Hello {{firstName}},</div>',
      text: 'Hello {{firstName}},',
    });
    setMode('builder');
  };

  const openEdit = (item: EmailContent) => {
    setEditing(item);
    setForm({ name: item.name || '', description: item.description || '', status: item.status || 'DRAFT' });
    const c = (item.content || {}) as EmailPayload;
    setPayload({
      subject: c.subject || '',
      preheader: c.preheader || '',
      html: c.html || '',
      text: c.text || '',
    });
    setMode('builder');
  };

  const save = () => {
    if (!form.name.trim()) return alert('Please provide Content Name');
    if (!payload.subject.trim()) return alert('Please provide Email Subject');
    if (!payload.html?.trim() && !payload.text?.trim()) return alert('Please provide HTML or Text body');
    upsertMutation.mutate();
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
      alert('Copied JSON');
    } catch {
      alert('Copy failed');
    }
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
        <div className="text-lg font-semibold mb-2">Email Content</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Email Content</div>
        <div className="text-sm text-error">
          {error instanceof Error ? error.message : 'Failed to load email contents'}
        </div>
      </div>
    );
  }

  if (mode === 'builder') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-base">Email Content</h1>
            <p className="text-sm text-secondary-text mt-1">Build email template (subject + HTML/text)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode('list');
                setEditing(null);
              }}
              className="px-4 py-2 border border-border rounded-md hover:bg-background"
            >
              Back
            </button>
            <button
              onClick={save}
              disabled={upsertMutation.isLoading}
              className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
            >
              {upsertMutation.isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Content Name <span className="text-error">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Welcome Email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="optional"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Status }))}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={copyJson}
                    className="px-4 py-2 border border-border rounded-md hover:bg-background"
                    type="button"
                  >
                    Copy JSON
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subject <span className="text-error">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={payload.subject}
                  onChange={(e) => setPayload((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g., Welcome to YDM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preheader</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={payload.preheader || ''}
                  onChange={(e) => setPayload((p) => ({ ...p, preheader: e.target.value }))}
                  placeholder="optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">HTML Body</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md font-mono text-xs"
                  rows={12}
                  value={payload.html || ''}
                  onChange={(e) => setPayload((p) => ({ ...p, html: e.target.value }))}
                  placeholder="<div>Hello</div>"
                />
                <div className="text-xs text-secondary-text mt-1">
                  Tips: use placeholders like <code className="bg-background px-1 rounded">{'{{firstName}}'}</code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Text Body (fallback)</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md font-mono text-xs"
                  rows={6}
                  value={payload.text || ''}
                  onChange={(e) => setPayload((p) => ({ ...p, text: e.target.value }))}
                  placeholder="Hello {{firstName}},"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Preview</div>
              <div className="text-xs text-secondary-text">Subject: {clampText(payload.subject, 60) || '-'}</div>
            </div>
            <div className="border border-border rounded-md p-4 bg-background">
              {payload.preheader ? (
                <div className="text-xs text-secondary-text mb-3">{payload.preheader}</div>
              ) : null}
              <div
                className="bg-white rounded-md p-4"
                dangerouslySetInnerHTML={{
                  __html:
                    payload.html?.trim() ||
                    `<pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;">${(payload.text || '').replace(
                      /</g,
                      '&lt;',
                    )}</pre>`,
                }}
              />
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
          <h1 className="text-2xl font-bold text-base">Email Content</h1>
          <p className="text-sm text-secondary-text mt-1">Manage email templates</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
          + Create
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Search by name"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-secondary-text">
              Total: <span className="font-medium text-base">{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Email Templates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.length > 0 ? (
                items.map((item) => {
                  const subject = item?.content?.subject || '';
                  return (
                    <tr key={item.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">
                        <div>{item.name}</div>
                        {item.description ? (
                          <div className="text-xs text-secondary-text">{clampText(item.description, 60)}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'ACTIVE'
                              ? 'bg-success/20 text-success'
                              : item.status === 'ARCHIVED'
                                ? 'bg-background text-secondary-text'
                                : 'bg-warning/20 text-warning'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{clampText(subject, 60) || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="px-3 py-1 border border-border rounded hover:bg-background"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item.id);
                            }}
                            disabled={deleteMutation.isLoading}
                            className="px-3 py-1 border border-border rounded hover:bg-background text-error disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary-text">
                    No email content yet. Click “Create” to add one.
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

