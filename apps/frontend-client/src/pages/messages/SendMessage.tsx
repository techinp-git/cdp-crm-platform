import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

type Channel = 'LINE' | 'MESSENGER' | 'EMAIL' | 'SMS';
type TemplateKind = 'LINE_CONTENT' | 'MESSENGER_CONTENT' | 'EMAIL_CONTENT' | 'SMS_CONTENT' | 'RAW';

type Option = { id: string; name: string; status?: string; type?: string };

function parseDestinations(text: string) {
  return text
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

type AudienceState =
  | { mode: 'MANUAL'; destinationsText: string }
  | { mode: 'FILTER'; customerType: '' | 'INDIVIDUAL' | 'COMPANY'; tagIds: string[] };

export function SendMessagePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const immediateId = params.id;
  const initialTab = searchParams.get('tab') || '';
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialTab === 'history' ? 4 : 1);
  const [channel, setChannel] = useState<Channel>('LINE');
  const templateKind: TemplateKind = useMemo(() => {
    if (channel === 'LINE') return 'LINE_CONTENT';
    if (channel === 'MESSENGER') return 'MESSENGER_CONTENT';
    if (channel === 'EMAIL') return 'EMAIL_CONTENT';
    return 'SMS_CONTENT';
  }, [channel]);

  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [audience, setAudience] = useState<AudienceState>({ mode: 'FILTER', customerType: '', tagIds: [] });
  const [rawPayload, setRawPayload] = useState('{\n  \n}');
  const [useRaw, setUseRaw] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'DRAFT' | 'SENT' | 'ARCHIVED'>('DRAFT');

  const listUrl = useMemo(() => {
    if (channel === 'LINE') return `${apiUrl}/line-contents?limit=100`;
    if (channel === 'MESSENGER') return `${apiUrl}/messenger-contents?limit=100`;
    if (channel === 'EMAIL') return `${apiUrl}/email-contents?limit=100`;
    return `${apiUrl}/sms-contents?limit=100`;
  }, [apiUrl, channel]);

  const { data: templatesResp, isLoading: templatesLoading } = useQuery(
    ['send-message-templates', tenantId, channel],
    async () => {
      const res = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to load templates');
      }
      return res.json();
    },
    { enabled: !!tenantId },
  );

  const templates: Option[] = templatesResp?.data || [];

  const { data: draftResp, isLoading: draftLoading } = useQuery(
    ['immediate', tenantId, immediateId],
    async () => {
      const res = await fetch(`${apiUrl}/messages/immediates/${immediateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load immediate');
      return body;
    },
    { enabled: !!tenantId && !!immediateId },
  );

  // Hydrate form when editing existing immediate
  useMemo(() => {
    if (!draftResp) return null;
    setName(draftResp.name || '');
    setChannel((draftResp.channel || 'LINE') as Channel);
    setDraftStatus((draftResp.status || 'DRAFT') as any);
    const a = draftResp.audience || {};
    if (String(a.mode || '').toUpperCase() === 'MANUAL') {
      const list = Array.isArray(a.destinations) ? a.destinations.join('\n') : '';
      setAudience({ mode: 'MANUAL', destinationsText: list });
    } else {
      setAudience({
        mode: 'FILTER',
        customerType: a.customerType || '',
        tagIds: Array.isArray(a.tagIds) ? a.tagIds : [],
      });
    }
    const tk = String(draftResp.templateKind || '').toUpperCase() as TemplateKind;
    if (tk === 'RAW') {
      setUseRaw(true);
      setRawPayload(JSON.stringify(draftResp.payload || {}, null, 2));
      setTemplateId('');
    } else {
      setUseRaw(false);
      setTemplateId(draftResp.templateId || '');
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftResp?.id]);

  const { data: tagsResp } = useQuery(
    ['send-message-tags', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/tags`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      if (!res.ok) return [];
      return res.json();
    },
    { enabled: !!tenantId },
  );
  const tags: Array<{ id: string; name: string; color?: string }> = Array.isArray(tagsResp) ? tagsResp : [];

  const estimateMutation = useMutation(async () => {
    const body: any = { channel };
    if (audience.mode === 'MANUAL') {
      body.audience = { mode: 'MANUAL', destinations: parseDestinations(audience.destinationsText) };
    } else {
      body.audience = {
        mode: 'FILTER',
        customerType: audience.customerType || undefined,
        tagIds: audience.tagIds,
      };
    }
    const res = await fetch(`${apiUrl}/messages/audience/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Estimate failed');
    return data as { count: number };
  });

  const sendMutation = useMutation(async () => {
    let payload: any = undefined;
    if (useRaw) {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        throw new Error('Invalid RAW JSON payload');
      }
    }

    const body: any = {
      channel,
      templateKind: useRaw ? 'RAW' : templateKind,
      templateId: useRaw ? undefined : templateId,
      name: name || undefined,
      payload,
    };
    if (audience.mode === 'MANUAL') {
      body.audience = { mode: 'MANUAL', destinations: parseDestinations(audience.destinationsText) };
    } else {
      body.audience = { mode: 'FILTER', customerType: audience.customerType || undefined, tagIds: audience.tagIds };
    }

    const res = await fetch(`${apiUrl}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Send failed');
    return data;
  });

  const saveDraftMutation = useMutation(async () => {
    const dto: any = {
      name,
      status: draftStatus,
      channel,
      templateKind: useRaw ? 'RAW' : templateKind,
      templateId: useRaw ? undefined : templateId,
      payload: useRaw ? JSON.parse(rawPayload || '{}') : undefined,
      audience:
        audience.mode === 'MANUAL'
          ? { mode: 'MANUAL', destinations: parseDestinations(audience.destinationsText) }
          : { mode: 'FILTER', customerType: audience.customerType || undefined, tagIds: audience.tagIds },
    };

    const url = immediateId ? `${apiUrl}/messages/immediates/${immediateId}` : `${apiUrl}/messages/immediates`;
    const method = immediateId ? 'PATCH' : 'POST';
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
    if (!res.ok) throw new Error(data?.message || 'Save draft failed');
    return data;
  }, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['immediates']);
      if (!immediateId && data?.id) {
        navigate(`/messages/send/${data.id}`);
      }
    }
  });

  const sendFromDraftMutation = useMutation(async () => {
    if (!immediateId) throw new Error('Please save draft first');
    const res = await fetch(`${apiUrl}/messages/immediates/${immediateId}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Send failed');
    return data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['immediates']);
      queryClient.invalidateQueries(['immediate-history', tenantId, immediateId]);
      setDraftStatus('SENT');
    }
  });

  const { data: historyResp } = useQuery(
    ['immediate-history', tenantId, immediateId],
    async () => {
      const res = await fetch(`${apiUrl}/messages/immediates/${immediateId}/history?limit=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load history');
      return body;
    },
    { enabled: !!tenantId && !!immediateId },
  );

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Send Message (Immediate)</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  if (draftLoading) {
    return (
      <div className="text-center py-12">
        <div>Loading...</div>
      </div>
    );
  }

  const destinationHint =
    channel === 'EMAIL'
      ? 'emails (one per line)'
      : channel === 'SMS'
        ? 'phones (one per line)'
        : channel === 'LINE'
          ? 'LINE userId (one per line)'
          : 'Messenger PSID (one per line)';

  const canNextFrom2 = audience.mode === 'MANUAL' ? parseDestinations(audience.destinationsText).length > 0 : true;
  const canNextFrom3 = useRaw ? true : !!templateId;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Send Message (Immediate)</h1>
          <p className="text-sm text-secondary-text mt-1">Queue messages to be delivered by channel</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {([1, 2, 3, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                step === s ? 'bg-primary text-base border-primary' : 'border-border hover:bg-background'
              }`}
            >
              Step {s}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setStep((p) => (p > 1 ? ((p - 1) as any) : p))}
              className="px-3 py-2 border border-border rounded-md hover:bg-background"
              disabled={step === 1}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep((p) => (p < 4 ? ((p + 1) as any) : p))}
              className="px-3 py-2 border border-border rounded-md hover:bg-background"
              disabled={(step === 2 && !canNextFrom2) || (step === 3 && !canNextFrom3) || step === 4}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">เลือกช่องทาง</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as Channel);
                  setTemplateId('');
                }}
              >
                <option value="LINE">LINE</option>
                <option value="MESSENGER">Messenger</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ชื่อการส่ง (optional)</label>
              <input
                className="w-full px-3 py-2 border border-border rounded-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น โปรโมชันวันนี้"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Draft Status</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as any)}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setAudience({ mode: 'FILTER', customerType: '', tagIds: [] })}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                audience.mode === 'FILTER' ? 'bg-primary text-base border-primary' : 'border-border hover:bg-background'
              }`}
            >
              Audience (preset/builder)
            </button>
            <button
              type="button"
              onClick={() => setAudience({ mode: 'MANUAL', destinationsText: '' })}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                audience.mode === 'MANUAL' ? 'bg-primary text-base border-primary' : 'border-border hover:bg-background'
              }`}
            >
              Manual List
            </button>
          </div>

          {audience.mode === 'MANUAL' ? (
            <div>
              <label className="block text-sm font-medium mb-1">
                ใส่ปลายทาง <span className="text-secondary-text">({destinationHint})</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md font-mono text-xs"
                rows={10}
                value={audience.destinationsText}
                onChange={(e) => setAudience({ mode: 'MANUAL', destinationsText: e.target.value })}
                placeholder="one-per-line"
              />
              <div className="text-xs text-secondary-text mt-1">Count: {parseDestinations(audience.destinationsText).length}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Type</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={audience.customerType}
                  onChange={(e) =>
                    setAudience({ mode: 'FILTER', customerType: e.target.value as any, tagIds: audience.tagIds })
                  }
                >
                  <option value="">All</option>
                  <option value="INDIVIDUAL">INDIVIDUAL</option>
                  <option value="COMPANY">COMPANY</option>
                </select>
                <div className="text-xs text-secondary-text mt-1">ระบบจะนับเฉพาะลูกค้าที่มี identifier ของช่องทางนี้</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (optional)</label>
                <div className="max-h-44 overflow-auto border border-border rounded-md p-2">
                  {tags.length === 0 ? (
                    <div className="text-sm text-secondary-text">No tags</div>
                  ) : (
                    tags.map((t) => {
                      const checked = audience.tagIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 py-1 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...audience.tagIds, t.id]))
                                : audience.tagIds.filter((x) => x !== t.id);
                              setAudience({ mode: 'FILTER', customerType: audience.customerType, tagIds: next });
                            }}
                          />
                          <span>{t.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => estimateMutation.mutate()}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                  disabled={estimateMutation.isLoading}
                >
                  {estimateMutation.isLoading ? 'Estimating...' : 'สรุปจำนวน Audience'}
                </button>
                {estimateMutation.isSuccess ? (
                  <div className="text-sm">
                    Audience (for {channel}): <b>{estimateMutation.data.count}</b>
                  </div>
                ) : null}
                {estimateMutation.isError ? (
                  <div className="text-sm text-error">
                    {estimateMutation.error instanceof Error ? estimateMutation.error.message : 'Estimate failed'}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">เลือก Content ตามช่องทาง</div>
            <label className="flex items-center gap-2 text-xs text-secondary-text">
              <input type="checkbox" checked={useRaw} onChange={(e) => setUseRaw(e.target.checked)} />
              Use RAW payload
            </label>
          </div>

          {!useRaw ? (
            <div>
              <select
                className="w-full px-3 py-2 border border-border rounded-md"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">{templatesLoading ? 'Loading...' : '-- Select template --'}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.status ? `(${t.status})` : ''}
                  </option>
                ))}
              </select>
              <div className="text-xs text-secondary-text mt-1">
                Source:{' '}
                {channel === 'LINE'
                  ? 'LINE Content'
                  : channel === 'MESSENGER'
                    ? 'Messenger Content'
                    : channel === 'EMAIL'
                      ? 'Email Content'
                      : 'SMS Content'}
              </div>
            </div>
          ) : (
            <div>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md font-mono text-xs"
                rows={12}
                value={rawPayload}
                onChange={(e) => setRawPayload(e.target.value)}
                placeholder='{"text":"hello"}'
              />
              <div className="text-xs text-secondary-text mt-1">RAW payload จะถูกเก็บและนำไปส่งโดย worker ภายหลัง</div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">สรุป</div>
            <div className="text-sm text-secondary-text mb-4">ตรวจสอบก่อนกดส่ง</div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-secondary-text">Channel:</span> <b>{channel}</b>
              </div>
              <div>
                <span className="text-secondary-text">Audience mode:</span> <b>{audience.mode}</b>
              </div>
              <div>
                <span className="text-secondary-text">Content:</span> <b>{useRaw ? 'RAW' : templateId ? 'Template selected' : '—'}</b>
              </div>
              <div>
                <span className="text-secondary-text">Audience count (for channel):</span>{' '}
                <b>
                  {audience.mode === 'MANUAL'
                    ? parseDestinations(audience.destinationsText).length
                    : estimateMutation.data?.count ?? '—'}
                </b>
              </div>
            </div>

            {sendMutation.isError ? (
              <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                {sendMutation.error instanceof Error ? sendMutation.error.message : 'Send failed'}
              </div>
            ) : null}
            {sendMutation.isSuccess ? (
              <div className="mt-4 p-3 bg-success/10 text-success rounded-md text-sm">
                Queued {sendMutation.data?.queued ?? '-'} delivery(ies). Broadcast ID: {sendMutation.data?.broadcastId}
              </div>
            ) : null}
            {saveDraftMutation.isError ? (
              <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                {saveDraftMutation.error instanceof Error ? saveDraftMutation.error.message : 'Save draft failed'}
              </div>
            ) : null}
            {saveDraftMutation.isSuccess ? (
              <div className="mt-4 p-3 bg-success/10 text-success rounded-md text-sm">
                Saved draft.
              </div>
            ) : null}
            {sendFromDraftMutation.isError ? (
              <div className="mt-4 p-3 bg-error/10 text-error rounded-md text-sm">
                {sendFromDraftMutation.error instanceof Error ? sendFromDraftMutation.error.message : 'Send failed'}
              </div>
            ) : null}
            {sendFromDraftMutation.isSuccess ? (
              <div className="mt-4 p-3 bg-success/10 text-success rounded-md text-sm">
                Sent (queued). Broadcast ID: {sendFromDraftMutation.data?.broadcastId}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => saveDraftMutation.mutate()}
                className="px-4 py-2 border border-border rounded-md hover:bg-background"
                disabled={saveDraftMutation.isLoading}
              >
                {saveDraftMutation.isLoading ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => {
                  if (!useRaw && !templateId) return alert('Please select content');
                  if (audience.mode === 'FILTER' && estimateMutation.data?.count === undefined) return alert('Please click "สรุปจำนวน Audience" ก่อน');
                  if (!immediateId) return alert('Please Save Draft first');
                  sendFromDraftMutation.mutate();
                }}
                disabled={sendFromDraftMutation.isLoading}
                className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400 disabled:opacity-50"
              >
                {sendFromDraftMutation.isLoading ? 'Sending...' : 'ส่งข้อความ'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">History (each send)</div>
            <div className="text-sm text-secondary-text mb-4">
              Each click “Send” creates a new broadcast record. You can re-send the same draft multiple times.
            </div>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Sent At</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Queued</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Broadcast ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border">
                  {Array.isArray(historyResp?.data) && historyResp.data.length ? (
                    historyResp.data.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm">{b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2 text-sm">{b.stats?.queued ?? b.stats?.total ?? '-'}</td>
                        <td className="px-4 py-2 text-xs font-mono">{b.id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-secondary-text text-sm">
                        No history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

