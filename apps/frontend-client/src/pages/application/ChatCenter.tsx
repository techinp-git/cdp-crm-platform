import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTenant } from '../../contexts/TenantContext';

type Conversation = {
  id: string;
  channel: string;
  externalId: string;
  title: string;
  lastMessage?: string;
  lastAt?: string;
};

type ChatMessage = {
  id: string;
  channel: string;
  direction: 'IN' | 'OUT';
  text?: string | null;
  timestamp: string;
  meta?: any;
};

type Identity = {
  id: string;
  channel: string;
  channelAccountId?: string | null;
  externalId: string;
};

type UnifiedUser = {
  id: string;
  displayName?: string | null;
  profile?: any;
  identities: Identity[];
};

function formatTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('th-TH');
  } catch {
    return iso;
  }
}

function chip(channel: string) {
  const ch = channel.toUpperCase();
  const cls =
    ch === 'LINE'
      ? 'bg-success/10 text-success'
      : ch === 'MESSENGER'
        ? 'bg-info/10 text-info'
        : 'bg-background text-secondary-text';
  return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{ch}</span>;
}

export function ChatCenter() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [channelFilter, setChannelFilter] = useState<'ALL' | 'LINE' | 'MESSENGER'>('ALL');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null);

  const conversationsQueryKey = useMemo(() => ['chat-center-conversations', tenantId, channelFilter, q], [tenantId, channelFilter, q]);

  const conversationsQuery = useQuery(
    conversationsQueryKey,
    async () => {
      const params = new URLSearchParams();
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);
      if (q) params.set('q', q);
      params.set('limit', '50');
      const res = await fetch(`${apiUrl}/chat-center/conversations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load conversations');
      return data as Conversation[];
    },
    { enabled: !!tenantId },
  );

  const messagesQueryKey = useMemo(
    () => ['chat-center-messages', tenantId, selected?.channel, selected?.externalId],
    [tenantId, selected?.channel, selected?.externalId],
  );

  const messagesQuery = useQuery(
    messagesQueryKey,
    async () => {
      if (!selected) return [];
      const res = await fetch(
        `${apiUrl}/chat-center/conversations/${encodeURIComponent(selected.channel)}/${encodeURIComponent(selected.externalId)}/messages?limit=200`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId } },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load messages');
      return data as ChatMessage[];
    },
    { enabled: !!tenantId && !!selected },
  );

  const unifiedQueryKey = useMemo(
    () => ['chat-center-unified', tenantId, selected?.channel, selected?.externalId],
    [tenantId, selected?.channel, selected?.externalId],
  );

  const unifiedQuery = useQuery(
    unifiedQueryKey,
    async () => {
      if (!selected) return null;
      const params = new URLSearchParams({ channel: selected.channel, externalId: selected.externalId });
      const res = await fetch(`${apiUrl}/chat-center/unified/by-identity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to load unified user');
      return data as UnifiedUser | null;
    },
    { enabled: !!tenantId && !!selected },
  );

  const linkMutation = useMutation(
    async () => {
      if (!selected) throw new Error('No conversation selected');
      const res = await fetch(`${apiUrl}/chat-center/unified/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
        body: JSON.stringify({
          channel: selected.channel,
          externalId: selected.externalId,
          displayName: selected.title,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Link failed');
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat-center-unified']);
      },
    },
  );

  const conversations: Conversation[] = conversationsQuery.data || [];
  const messages: ChatMessage[] = messagesQuery.data || [];
  const unifiedUser: UnifiedUser | null = unifiedQuery.data ?? null;

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Chat Center</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-4">
      {/* Left: conversation list */}
      <div className="col-span-12 lg:col-span-4 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-semibold">Chat Center</div>
          <div className="text-xs text-secondary-text mt-1">
            รองรับหลายช่องทาง (LINE/Messenger) และวางโครง unify user
          </div>
          <div className="mt-3 flex gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-md text-sm"
            >
              <option value="ALL">All</option>
              <option value="LINE">LINE</option>
              <option value="MESSENGER">Messenger</option>
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
        </div>

        {conversationsQuery.isError && (
          <div className="p-4 text-sm text-error bg-error/10">{(conversationsQuery.error as any)?.message || 'Failed to load'}</div>
        )}

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-sm text-secondary-text">No conversations found.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-background ${
                  selected?.id === c.id ? 'bg-background' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium truncate">{c.title}</div>
                  {chip(c.channel)}
                </div>
                <div className="text-xs text-secondary-text mt-1 truncate">{c.lastMessage || '-'}</div>
                <div className="text-[11px] text-secondary-text mt-1">{formatTime(c.lastAt)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Middle: messages */}
      <div className="col-span-12 lg:col-span-5 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-semibold">{selected ? selected.title : 'Select a conversation'}</div>
            {selected ? <div className="text-xs text-secondary-text">{selected.channel} • {selected.externalId}</div> : null}
          </div>
          {selected ? chip(selected.channel) : null}
        </div>

        {messagesQuery.isError && (
          <div className="p-4 text-sm text-error bg-error/10">{(messagesQuery.error as any)?.message || 'Failed to load messages'}</div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          {selected ? (
            messages.length > 0 ? (
              messages.map((m) => (
                <div key={m.id} className="bg-white border border-border rounded-lg p-3">
                  <div className="text-xs text-secondary-text flex items-center justify-between">
                    <span>{m.direction}</span>
                    <span>{formatTime(m.timestamp)}</span>
                  </div>
                  <div className="text-sm mt-2 whitespace-pre-wrap">{m.text || '-'}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-secondary-text">No messages.</div>
            )
          ) : (
            <div className="text-sm text-secondary-text">Choose a conversation from the left.</div>
          )}
        </div>
      </div>

      {/* Right: unify user panel */}
      <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="font-semibold">Unified User</div>
          <div className="text-xs text-secondary-text mt-1">
            เผื่อรวมคนเดียวกันจากหลายช่องทาง (LINE 1/2, FB 1/2, IG ฯลฯ)
          </div>
        </div>

        {unifiedQuery.isError && (
          <div className="p-4 text-sm text-error bg-error/10">{(unifiedQuery.error as any)?.message || 'Failed to load unified user'}</div>
        )}

        <div className="flex-1 p-4 overflow-y-auto">
          {!selected ? (
            <div className="text-sm text-secondary-text">Select a conversation first.</div>
          ) : unifiedUser ? (
            <div>
              <div className="text-sm font-medium">{unifiedUser.displayName || 'Unnamed User'}</div>
              <div className="text-xs text-secondary-text mt-1">ID: {unifiedUser.id}</div>
              <div className="mt-4">
                <div className="text-xs font-semibold mb-2">Linked identities</div>
                <div className="space-y-2">
                  {unifiedUser.identities?.map((i) => (
                    <div key={i.id} className="border border-border rounded-md p-2">
                      <div className="text-xs font-medium">{i.channel}</div>
                      <div className="text-xs text-secondary-text break-all">{i.externalId}</div>
                    </div>
                  )) || null}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-secondary-text mb-3">
                ยังไม่ถูก link เข้ากับ unified user
              </div>
              <button
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isLoading}
                className="w-full px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
              >
                {linkMutation.isLoading ? 'Linking...' : 'Create & Link Unified User'}
              </button>
              {linkMutation.isError && (
                <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
                  {linkMutation.error instanceof Error ? linkMutation.error.message : 'Link failed'}
                </div>
              )}
              <div className="text-xs text-secondary-text mt-3">
                ขั้นต่อไป: เลือก unified user ที่มีอยู่แล้วเพื่อ link เพิ่ม (จะเพิ่มในรอบถัดไป)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

