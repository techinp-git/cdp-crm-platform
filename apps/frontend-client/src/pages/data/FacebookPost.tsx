import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type FbPage = {
  id: string;
  pageId: string;
  name?: string | null;
  updatedAt: string;
};

type FbPost = {
  id: string;
  pageId: string;
  facebookPostId?: string | null;
  status: string;
  message?: string | null;
  link?: string | null;
  permalinkUrl?: string | null;
  fullPicture?: string | null;
  fbCreatedAt?: string | null;
  media?: any;
  providerMeta?: any;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

function truncate(s: string, n: number) {
  const t = String(s || '');
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function pickPreviewImage(p: FbPost): string | null {
  if (p.fullPicture) return p.fullPicture;
  const media = p.media;
  if (Array.isArray(media)) {
    const img = media.find((m) => m && String(m.type || '').toLowerCase() === 'image' && typeof m.url === 'string' && m.url.trim());
    if (img) return String(img.url).trim();
  }
  return null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function FacebookPost() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [tab, setTab] = useState<'posts' | 'settings'>('posts');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [pageIdFilter, setPageIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedId, setSelectedId] = useState<string>('');

  // Settings form
  const [pageForm, setPageForm] = useState({ pageId: '', name: '', accessToken: '' });

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draft, setDraft] = useState({
    pageId: '',
    message: '',
    link: '',
    imageUrl: '',
    imageDataUrl: '',
  });

  const { data: pages, isLoading: pagesLoading } = useQuery(
    ['facebook-post-pages', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/facebook-post/pages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load pages');
      return Array.isArray(body) ? body : [];
    },
    { enabled: !!tenantId },
  );

  const pagesList: FbPage[] = pages || [];

  const { data: postsResp, isLoading: postsLoading, isError: postsIsError, error: postsError } = useQuery(
    ['facebook-post-posts', tenantId, q, status, pageIdFilter, page, limit],
    async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (pageIdFilter) params.set('pageId', pageIdFilter);
      const res = await fetch(`${apiUrl}/facebook-post/posts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load posts');
      return body;
    },
    { enabled: !!tenantId },
  );

  const posts: FbPost[] = postsResp?.data || [];
  const totalPages: number = postsResp?.totalPages || 1;

  const selected = useMemo(() => posts.find((p) => p.id === selectedId) || null, [posts, selectedId]);

  const upsertPageMutation = useMutation(
    async () => {
      const res = await fetch(`${apiUrl}/facebook-post/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(pageForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Save failed');
      return body;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['facebook-post-pages', tenantId]);
        setPageForm({ pageId: '', name: '', accessToken: '' });
      },
    },
  );

  const deletePageMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/facebook-post/pages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Delete failed');
      return body;
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['facebook-post-pages', tenantId]),
    },
  );

  const syncMutation = useMutation(
    async (p: { pageId: string; limit?: number }) => {
      const res = await fetch(`${apiUrl}/facebook-post/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(p),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Sync failed');
      return body;
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['facebook-post-posts', tenantId]),
    },
  );

  const createDraftMutation = useMutation(
    async () => {
      const media = [];
      const img = draft.imageUrl || draft.imageDataUrl;
      if (img) media.push({ type: 'image', url: img });
      const payload = {
        pageId: draft.pageId,
        message: draft.message || undefined,
        link: draft.link || undefined,
        media: media.length ? media : undefined,
        status: 'DRAFT',
      };
      const res = await fetch(`${apiUrl}/facebook-post/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Create draft failed');
      return body;
    },
    {
      onSuccess: (created: any) => {
        queryClient.invalidateQueries(['facebook-post-posts', tenantId]);
        setShowDraftModal(false);
        setDraft({ pageId: '', message: '', link: '', imageUrl: '', imageDataUrl: '' });
        if (created?.id) setSelectedId(created.id);
      },
    },
  );

  const publishMutation = useMutation(
    async (id: string) => {
      const res = await fetch(`${apiUrl}/facebook-post/posts/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Publish failed');
      return body;
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['facebook-post-posts', tenantId]),
    },
  );

  const canSync = pagesList.length > 0;

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Facebook Post</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  const loading = pagesLoading || postsLoading;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Facebook Post</h1>
          <p className="text-sm text-secondary-text mt-1">Sync posts from Facebook API and create draft posts with image preview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('posts')}
            className={`px-4 py-2 rounded-md font-medium ${tab === 'posts' ? 'bg-primary text-base' : 'border border-border hover:bg-background'}`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-md font-medium ${tab === 'settings' ? 'bg-primary text-base' : 'border border-border hover:bg-background'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">Connect Facebook Page</div>
            <div className="text-sm text-secondary-text mb-4">Save Page ID + Access Token for Graph API</div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Page ID</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={pageForm.pageId}
                  onChange={(e) => setPageForm((p) => ({ ...p, pageId: e.target.value }))}
                  placeholder="123456789012345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Page Name (optional)</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={pageForm.name}
                  onChange={(e) => setPageForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="My Page"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Page Access Token</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md h-28"
                  value={pageForm.accessToken}
                  onChange={(e) => setPageForm((p) => ({ ...p, accessToken: e.target.value }))}
                  placeholder="EAAB..."
                />
                <div className="text-xs text-secondary-text mt-1">
                  Token จะถูกเก็บใน database (prototype). ถ้าต้องการเข้ารหัส/secret manager บอกได้ครับ
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => upsertPageMutation.mutate()}
                  disabled={upsertPageMutation.isLoading}
                  className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                >
                  {upsertPageMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
                {upsertPageMutation.isError ? (
                  <div className="text-sm text-error">
                    {upsertPageMutation.error instanceof Error ? upsertPageMutation.error.message : 'Save failed'}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">Connected Pages</div>
            <div className="text-sm text-secondary-text mb-4">Pages available for sync/publish</div>

            <div className="space-y-3">
              {pagesList.length ? (
                pagesList.map((p) => (
                  <div key={p.id} className="border border-border rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate">{p.name || `Page ${p.pageId}`}</div>
                      <div className="text-sm text-secondary-text">Page ID: {p.pageId}</div>
                      <div className="text-xs text-secondary-text mt-1">Updated: {new Date(p.updatedAt).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => deletePageMutation.mutate(p.id)}
                      disabled={deletePageMutation.isLoading}
                      className="px-3 py-2 border border-border rounded-md hover:bg-background disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-secondary-text">No pages yet.</div>
              )}
              {deletePageMutation.isError ? (
                <div className="text-sm text-error">
                  {deletePageMutation.error instanceof Error ? deletePageMutation.error.message : 'Delete failed'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Search</label>
                <input
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="Message or Facebook Post ID"
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
                  <option value="DRAFT">DRAFT</option>
                  <option value="SYNCED">SYNCED</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Page</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={pageIdFilter}
                  onChange={(e) => {
                    setPageIdFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {pagesList.map((p) => (
                    <option key={p.id} value={p.pageId}>
                      {p.name || p.pageId}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowDraftModal(true)}
                  className="flex-1 bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
                >
                  + New Draft
                </button>
                <button
                  onClick={() => {
                    const pid = pageIdFilter || pagesList[0]?.pageId;
                    if (!pid) return alert('Please add Page ID + Access Token in Settings first');
                    syncMutation.mutate({ pageId: pid, limit: 25 });
                  }}
                  disabled={!canSync || syncMutation.isLoading}
                  className="flex-1 px-4 py-2 border border-border rounded-md font-medium hover:bg-background disabled:opacity-50"
                >
                  {syncMutation.isLoading ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>

            {syncMutation.isError ? (
              <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                {syncMutation.error instanceof Error ? syncMutation.error.message : 'Sync failed'}
              </div>
            ) : null}
            {syncMutation.isSuccess ? (
              <div className="mt-4 p-3 bg-success/10 text-success rounded-md text-sm">
                Sync complete. Success={syncMutation.data?.success || 0} Failed={syncMutation.data?.failed || 0}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : postsIsError ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-error">{postsError instanceof Error ? postsError.message : 'Failed to load'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <div className="text-lg font-semibold">Posts</div>
                  <div className="text-sm text-secondary-text">
                    Page {postsResp?.page || 1} / {postsResp?.totalPages || 1}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Image</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Message</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">FB</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border">
                      {posts.length ? (
                        posts.map((p) => {
                          const img = pickPreviewImage(p);
                          const time = p.fbCreatedAt || p.createdAt;
                          return (
                            <tr
                              key={p.id}
                              className={`hover:bg-background cursor-pointer ${selectedId === p.id ? 'bg-background' : ''}`}
                              onClick={() => setSelectedId(p.id)}
                            >
                              <td className="px-4 py-3">
                                {img ? (
                                  <img src={img} alt="preview" className="w-12 h-12 object-cover rounded border border-border" />
                                ) : (
                                  <div className="w-12 h-12 rounded border border-border bg-background" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="font-medium text-base">{truncate(p.message || '(no message)', 60)}</div>
                                <div className="text-xs text-secondary-text">Page: {p.pageId}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="px-2 py-1 rounded bg-background border border-border">{p.status}</span>
                                {p.status === 'FAILED' && p.errorMessage ? (
                                  <div className="text-xs text-error mt-1">{truncate(p.errorMessage, 60)}</div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-xs font-mono text-secondary-text">{p.facebookPostId || '-'}</td>
                              <td className="px-4 py-3 text-sm text-secondary-text">{time ? new Date(time).toLocaleString() : '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-secondary-text">
                            No posts yet. Click “Sync” or “New Draft”.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-secondary-text">
                      Page {page} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-lg font-semibold mb-2">Details</div>
                {!selected ? (
                  <div className="text-sm text-secondary-text">Select a post from the list.</div>
                ) : (
                  <>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-secondary-text">Status:</span> <span className="font-medium text-base">{selected.status}</span>
                      </div>
                      <div>
                        <span className="text-secondary-text">Page ID:</span> <span className="font-mono text-xs">{selected.pageId}</span>
                      </div>
                      <div>
                        <span className="text-secondary-text">Facebook ID:</span> <span className="font-mono text-xs">{selected.facebookPostId || '-'}</span>
                      </div>
                      <div>
                        <span className="text-secondary-text">Permalink:</span>{' '}
                        {selected.permalinkUrl ? (
                          <a className="text-primary underline" href={selected.permalinkUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          '-'
                        )}
                      </div>
                      <div>
                        <span className="text-secondary-text">Created:</span>{' '}
                        <span>{new Date(selected.fbCreatedAt || selected.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium mb-1">Message</div>
                      <div className="text-sm text-secondary-text whitespace-pre-wrap border border-border rounded-md p-3 bg-background">
                        {selected.message || '-'}
                      </div>
                    </div>

                    {selected.link ? (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">Link</div>
                        <div className="text-sm">
                          <a className="text-primary underline" href={selected.link} target="_blank" rel="noreferrer">
                            {selected.link}
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {pickPreviewImage(selected) ? (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">Image</div>
                        <img
                          src={pickPreviewImage(selected) as string}
                          alt="preview"
                          className="w-full max-h-64 object-cover rounded border border-border"
                        />
                        <div className="text-xs text-secondary-text mt-1">
                          Note: ถ้าเป็นรูปจาก upload (data URL) จะ preview ได้ แต่ publish ไป Facebook ต้องใช้ image URL (http/https)
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => publishMutation.mutate(selected.id)}
                        disabled={publishMutation.isLoading}
                        className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-black/80 disabled:opacity-50"
                      >
                        {publishMutation.isLoading ? 'Publishing...' : 'Publish'}
                      </button>
                      <Link to="/data/sources/messenger" className="px-4 py-2 border border-border rounded-md hover:bg-background">
                        Go to Messenger Sync
                      </Link>
                    </div>
                    {publishMutation.isError ? (
                      <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
                        {publishMutation.error instanceof Error ? publishMutation.error.message : 'Publish failed'}
                      </div>
                    ) : null}
                    {publishMutation.isSuccess ? (
                      <div className="mt-3 p-3 bg-success/10 text-success rounded-md text-sm">Published successfully.</div>
                    ) : null}

                    <div className="mt-6">
                      <div className="text-sm font-medium mb-1">Raw (providerMeta)</div>
                      <pre className="text-xs bg-background border border-border rounded-md p-3 overflow-auto max-h-64">
                        {JSON.stringify(selected.providerMeta || {}, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {showDraftModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow max-w-2xl w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-lg font-semibold">New Draft</div>
                    <div className="text-sm text-secondary-text">Create a draft post with example image preview</div>
                  </div>
                  <button className="text-secondary-text hover:text-base" onClick={() => setShowDraftModal(false)}>
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Page</label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-md"
                      value={draft.pageId}
                      onChange={(e) => setDraft((d) => ({ ...d, pageId: e.target.value }))}
                    >
                      <option value="">Select page</option>
                      {pagesList.map((p) => (
                        <option key={p.id} value={p.pageId}>
                          {p.name || p.pageId}
                        </option>
                      ))}
                    </select>
                    {!pagesList.length ? <div className="text-xs text-error mt-1">Please add a page in Settings first.</div> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea
                      className="w-full px-3 py-2 border border-border rounded-md h-28"
                      value={draft.message}
                      onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                      placeholder="Write your post..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Link (optional)</label>
                    <input
                      className="w-full px-3 py-2 border border-border rounded-md"
                      value={draft.link}
                      onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Image URL (for publish)</label>
                      <input
                        className="w-full px-3 py-2 border border-border rounded-md"
                        value={draft.imageUrl}
                        onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value, imageDataUrl: '' }))}
                        placeholder="https://.../image.jpg"
                      />
                      <div className="text-xs text-secondary-text mt-1">ถ้าจะ publish พร้อมรูป แนะนำใส่ URL แบบ http(s)</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Upload image (preview only)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await fileToDataUrl(f);
                          setDraft((d) => ({ ...d, imageDataUrl: dataUrl, imageUrl: '' }));
                        }}
                      />
                      <div className="text-xs text-secondary-text mt-1">ไฟล์จะถูกเก็บเป็น data URL ใน DB (prototype)</div>
                    </div>
                  </div>

                  {(draft.imageUrl || draft.imageDataUrl) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Preview</label>
                      <img
                        src={draft.imageUrl || draft.imageDataUrl}
                        alt="preview"
                        className="w-full max-h-64 object-cover rounded border border-border"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setShowDraftModal(false)} className="px-4 py-2 border border-border rounded-md hover:bg-background">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!draft.pageId) return alert('Please select page');
                        createDraftMutation.mutate();
                      }}
                      disabled={createDraftMutation.isLoading}
                      className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
                    >
                      {createDraftMutation.isLoading ? 'Creating...' : 'Create Draft'}
                    </button>
                  </div>
                  {createDraftMutation.isError ? (
                    <div className="mt-2 p-3 bg-error/10 text-error rounded-md text-sm">
                      {createDraftMutation.error instanceof Error ? createDraftMutation.error.message : 'Create failed'}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

