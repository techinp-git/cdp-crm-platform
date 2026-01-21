import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

type Channel = 'LINE' | 'MESSENGER' | 'EMAIL' | 'SMS';
type TemplateKind = 'LINE_CONTENT' | 'MESSENGER_CONTENT' | 'EMAIL_CONTENT' | 'SMS_CONTENT';

type AudienceMode = 'FILTER' | 'MANUAL';
type AudienceState =
  | { mode: 'FILTER'; customerType?: string; tagIds: string[] }
  | { mode: 'MANUAL'; destinationsText: string };

type Option = { id: string; name: string };

type ScheduleCadence = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

function parseDestinations(text: string): string[] {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function cadenceLabel(c: ScheduleCadence) {
  if (c === 'ONCE') return 'Once';
  if (c === 'DAILY') return 'Daily';
  if (c === 'WEEKLY') return 'Weekly';
  return 'Monthly';
}

function toDateYYYYMMDD(v: any): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toTimeHHMM(v: any): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}

export function CampaignBuilderPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = params.id;
  const initialTab = searchParams.get('tab') || '';

  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id || '';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialTab === 'history' ? 4 : 1);
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('DRAFT');
  const [channel, setChannel] = useState<Channel>('LINE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cadence, setCadence] = useState<ScheduleCadence>('ONCE');
  const [timeHHMM, setTimeHHMM] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [always, setAlways] = useState<boolean>(true);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);

  const [audience, setAudience] = useState<AudienceState>({ mode: 'FILTER', customerType: '', tagIds: [] });
  const [useRaw, setUseRaw] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [rawPayload, setRawPayload] = useState('{\n  \n}');

  const templateKind: TemplateKind =
    channel === 'LINE' ? 'LINE_CONTENT' : channel === 'MESSENGER' ? 'MESSENGER_CONTENT' : channel === 'EMAIL' ? 'EMAIL_CONTENT' : 'SMS_CONTENT';

  const templatesQuery = useQuery(
    ['campaign-templates', tenantId, channel],
    async () => {
      const endpoint =
        channel === 'LINE'
          ? 'line-contents'
          : channel === 'MESSENGER'
            ? 'messenger-contents'
            : channel === 'EMAIL'
              ? 'email-contents'
              : 'sms-contents';
      const res = await fetch(`${apiUrl}/${endpoint}?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load templates');
      return body;
    },
    { enabled: !!tenantId },
  );
  const templates: Option[] = templatesQuery.data?.data || [];

  const tagsQuery = useQuery(
    ['tags', tenantId],
    async () => {
      const res = await fetch(`${apiUrl}/tags`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load tags');
      return Array.isArray(body) ? body : [];
    },
    { enabled: !!tenantId },
  );
  const tags: Array<{ id: string; name: string; color?: string }> = tagsQuery.data || [];
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const draftQuery = useQuery(
    ['campaign', tenantId, campaignId],
    async () => {
      const res = await fetch(`${apiUrl}/messages/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load campaign');
      return body;
    },
    { enabled: !!tenantId && !!campaignId },
  );

  // hydrate once when loaded
  useMemo(() => {
    const d = draftQuery.data;
    if (!d) return null;
    setName(d.name || '');
    setDescription(d.description || '');
    setStatus((d.status || 'DRAFT') as any);
    setChannel((d.channel || 'LINE') as Channel);
    // schedule
    const s = d.schedule || null;
    if (s) {
      setCadence((String(s.cadence || 'ONCE').toUpperCase() as ScheduleCadence) || 'ONCE');
      setTimeHHMM(String(s.time || '').slice(0, 5));
      setStartDate(String(s.startDate || ''));
      setAlways(Boolean(s.always === undefined ? true : s.always));
      setEndDate(s.endDate ? String(s.endDate) : '');
      setWeekdays(Array.isArray(s.weekdays) ? s.weekdays.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [1, 2, 3, 4, 5]);
      setDayOfMonth(Number(s.dayOfMonth || 1));
    } else if (d.scheduleAt) {
      // backward: derive ONCE schedule from scheduleAt
      setCadence('ONCE');
      setTimeHHMM(toTimeHHMM(d.scheduleAt));
      setStartDate(toDateYYYYMMDD(d.scheduleAt));
      setAlways(true);
      setEndDate('');
    }
    const a = d.audience || {};
    if (String(a.mode || '').toUpperCase() === 'MANUAL') {
      const list = Array.isArray(a.destinations) ? a.destinations.join('\n') : '';
      setAudience({ mode: 'MANUAL', destinationsText: list });
    } else {
      setAudience({ mode: 'FILTER', customerType: a.customerType || '', tagIds: Array.isArray(a.tagIds) ? a.tagIds : [] });
    }
    const tk = String(d.templateKind || '').toUpperCase();
    if (tk === 'RAW') {
      setUseRaw(true);
      setRawPayload(JSON.stringify(d.payload || {}, null, 2));
      setTemplateId('');
    } else {
      setUseRaw(false);
      setTemplateId(d.templateId || '');
    }
    return null;
  }, [draftQuery.data?.id]);

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

  const saveMutation = useMutation(
    async () => {
      const normalizedCadence = String(cadence || 'ONCE').toUpperCase() as ScheduleCadence;
      const schedule: any = {
        cadence: normalizedCadence,
        time: timeHHMM,
        startDate,
        always: normalizedCadence === 'ONCE' ? true : always,
        endDate: normalizedCadence === 'ONCE' ? null : always ? null : endDate,
        weekdays: normalizedCadence === 'WEEKLY' ? weekdays : undefined,
        dayOfMonth: normalizedCadence === 'MONTHLY' ? dayOfMonth : undefined,
      };

      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        channel,
        schedule,
        audience:
          audience.mode === 'MANUAL'
            ? { mode: 'MANUAL', destinations: parseDestinations(audience.destinationsText) }
            : { mode: 'FILTER', customerType: audience.customerType || undefined, tagIds: audience.tagIds },
        templateKind: useRaw ? 'RAW' : templateKind,
        templateId: useRaw ? undefined : templateId,
        payload: useRaw ? JSON.parse(rawPayload || '{}') : undefined,
      };
      if (!payload.name) throw new Error('name is required');
      if (!schedule.time) throw new Error('time is required');
      if (!schedule.startDate) throw new Error('start date is required');
      if (schedule.cadence !== 'ONCE' && !schedule.always && !schedule.endDate) throw new Error('end date is required');
      if (schedule.cadence === 'WEEKLY' && (!Array.isArray(schedule.weekdays) || schedule.weekdays.length === 0))
        throw new Error('Please select at least 1 weekday');
      if (schedule.cadence === 'MONTHLY' && (!schedule.dayOfMonth || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31))
        throw new Error('day of month must be 1-31');

      const url = campaignId ? `${apiUrl}/messages/campaigns/${campaignId}` : `${apiUrl}/messages/campaigns`;
      const method = campaignId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
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
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['campaigns']);
        if (!campaignId && data?.id) navigate(`/messages/campaign/${data.id}`);
      },
    },
  );

  const runNowMutation = useMutation(
    async () => {
      if (!campaignId) throw new Error('Please save campaign first');
      if (!useRaw && !templateId) throw new Error('Please select template');
      if (audience.mode === 'MANUAL') {
        if (parseDestinations(audience.destinationsText).length === 0) throw new Error('Please provide destinations');
      } else {
        if (estimateMutation.data?.count === undefined) throw new Error('Please click "Estimate audience" first');
        if (estimateMutation.data.count === 0) throw new Error('Audience is 0');
      }
      const res = await fetch(`${apiUrl}/messages/campaigns/${campaignId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Run failed');
      return body;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['campaigns']);
        queryClient.invalidateQueries(['campaign-history', tenantId, campaignId]);
      },
    },
  );

  const historyQuery = useQuery(
    ['campaign-history', tenantId, campaignId],
    async () => {
      const res = await fetch(`${apiUrl}/messages/campaigns/${campaignId}/history?limit=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'x-tenant-id': tenantId },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Failed to load history');
      return body;
    },
    { enabled: !!tenantId && !!campaignId },
  );

  const scheduleSummaryText = useMemo(() => {
    const range = always || cadence === 'ONCE' ? `${startDate || '—'} → Always` : `${startDate || '—'} → ${endDate || '—'}`;
    const time = timeHHMM || '—';
    const triggerExtra =
      cadence === 'WEEKLY'
        ? ` • ${weekdays
            .map((n) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n] || String(n))
            .join(', ') || '—'}`
        : cadence === 'MONTHLY'
          ? ` • day ${dayOfMonth || 1}`
          : '';
    return `${cadenceLabel(cadence)}${triggerExtra} • ${time} • ${range}`;
  }, [always, cadence, dayOfMonth, endDate, startDate, timeHHMM, weekdays]);

  const selectedTemplateName = useMemo(() => {
    if (useRaw) return 'RAW payload';
    const t = templates.find((x) => x.id === templateId);
    return t ? t.name : templateId ? `Template: ${templateId}` : '—';
  }, [templates, templateId, useRaw]);

  const audienceSummaryText = useMemo(() => {
    if (audience.mode === 'MANUAL') {
      const n = parseDestinations(audience.destinationsText).length;
      return `Manual list • ${n} destinations`;
    }
    const ct = audience.customerType ? `Type: ${audience.customerType}` : 'Type: All';
    const tagNames = audience.tagIds.map((id) => tagsById.get(id)?.name || id);
    const tagsText = tagNames.length ? `Tags: ${tagNames.join(', ')}` : 'Tags: —';
    return `Filter • ${ct} • ${tagsText}`;
  }, [audience, tagsById]);

  const audienceCountForSummary = useMemo(() => {
    if (audience.mode === 'MANUAL') return parseDestinations(audience.destinationsText).length;
    return estimateMutation.data?.count;
  }, [audience, estimateMutation.data?.count]);

  if (!tenantId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-2">Campaign Builder</div>
        <div className="text-sm text-secondary-text">Please select a tenant before using this page.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Campaign Builder</h1>
          <p className="text-sm text-secondary-text mt-1">Draft → schedule → run now (history stored)</p>
        </div>
        <Link to="/messages/campaign" className="px-4 py-2 border border-border rounded-md hover:bg-background">
          ← Back to list
        </Link>
      </div>

      {/* Step nav */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setStep(n as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${step === n ? 'bg-primary text-base' : 'bg-background'}`}
            >
              Step {n}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Channel</label>
              <select className="w-full px-3 py-2 border border-border rounded-md" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                <option value="LINE">LINE</option>
                <option value="MESSENGER">MESSENGER</option>
                <option value="EMAIL">EMAIL</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-border rounded-md" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Campaign name</label>
              <input className="w-full px-3 py-2 border border-border rounded-md" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-md h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAudience({ mode: 'FILTER', customerType: '', tagIds: [] })}
              className={`px-3 py-2 rounded-md text-sm font-medium ${audience.mode === 'FILTER' ? 'bg-primary text-base' : 'bg-background'}`}
            >
              Filter
            </button>
            <button
              onClick={() => setAudience({ mode: 'MANUAL', destinationsText: '' })}
              className={`px-3 py-2 rounded-md text-sm font-medium ${audience.mode === 'MANUAL' ? 'bg-primary text-base' : 'bg-background'}`}
            >
              Manual list
            </button>
          </div>

          {audience.mode === 'MANUAL' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Destinations (1 per line)</label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md h-40"
                value={audience.destinationsText}
                onChange={(e) => setAudience({ mode: 'MANUAL', destinationsText: e.target.value })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer type</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={audience.customerType || ''}
                  onChange={(e) => setAudience({ ...audience, customerType: e.target.value })}
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
                      const checked = audience.tagIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-sm mb-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...audience.tagIds, t.id]))
                                : audience.tagIds.filter((x) => x !== t.id);
                              setAudience({ ...audience, tagIds: next });
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
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useRaw} onChange={(e) => setUseRaw(e.target.checked)} />
              Use RAW payload
            </label>
          </div>

          {!useRaw ? (
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select className="w-full px-3 py-2 border border-border rounded-md" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">-- select --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">RAW JSON</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-md h-48 font-mono text-xs" value={rawPayload} onChange={(e) => setRawPayload(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">Schedule</div>
            <div className="text-sm text-secondary-text mb-4">Set Trigger + Time + When. (Scheduler not implemented yet; you can run now.)</div>

            <div className="border border-border rounded-md p-4 mb-4 bg-background">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Summary</div>
                <button
                  type="button"
                  onClick={() => estimateMutation.mutate()}
                  disabled={estimateMutation.isLoading || audience.mode === 'MANUAL'}
                  className="px-3 py-2 border border-border rounded-md text-sm hover:bg-white disabled:opacity-50"
                  title={audience.mode === 'MANUAL' ? 'Manual list does not require estimate' : 'Estimate audience count'}
                >
                  {audience.mode === 'MANUAL' ? 'Estimate audience' : estimateMutation.isLoading ? 'Estimating...' : 'Estimate audience'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Campaign</div>
                  <div className="font-medium text-base text-right">{name || '—'}</div>
                </div>
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Channel</div>
                  <div className="font-medium text-base">{channel}</div>
                </div>
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Content</div>
                  <div className="font-medium text-base text-right">{selectedTemplateName}</div>
                </div>
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Audience</div>
                  <div className="font-medium text-base text-right">{audienceSummaryText}</div>
                </div>
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Audience count</div>
                  <div className="font-medium text-base">
                    {audience.mode === 'MANUAL' ? (
                      <span>{audienceCountForSummary ?? 0}</span>
                    ) : estimateMutation.data?.count !== undefined ? (
                      <span>{estimateMutation.data.count}</span>
                    ) : (
                      <span className="text-secondary-text">— (click “Estimate audience”)</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-3">
                  <div className="text-secondary-text">Schedule</div>
                  <div className="font-medium text-base text-right">{scheduleSummaryText}</div>
                </div>
              </div>

              {estimateMutation.isError ? (
                <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
                  {estimateMutation.error instanceof Error ? estimateMutation.error.message : 'Estimate failed'}
                </div>
              ) : null}
            </div>

            <div className="border border-border rounded-md p-4 mb-4">
              <div className="text-sm font-semibold mb-3">Trigger</div>
              <div className="flex flex-wrap gap-2">
                {(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as ScheduleCadence[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCadence(c)}
                    className={`px-4 py-2 rounded-md text-sm font-medium border ${
                      cadence === c ? 'bg-black text-white border-black' : 'bg-white border-border hover:bg-background'
                    }`}
                  >
                    {c === 'ONCE' ? 'Once' : c === 'DAILY' ? 'Daily' : c === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>

              {cadence === 'WEEKLY' && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Days of week</div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { n: 0, label: 'Sun' },
                      { n: 1, label: 'Mon' },
                      { n: 2, label: 'Tue' },
                      { n: 3, label: 'Wed' },
                      { n: 4, label: 'Thu' },
                      { n: 5, label: 'Fri' },
                      { n: 6, label: 'Sat' },
                    ].map((d) => {
                      const checked = weekdays.includes(d.n);
                      return (
                        <label key={d.n} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked ? Array.from(new Set([...weekdays, d.n])) : weekdays.filter((x) => x !== d.n);
                              setWeekdays(next.sort((a, b) => a - b));
                            }}
                          />
                          {d.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {cadence === 'MONTHLY' && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Day of month</div>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Time<span className="text-error">*</span>
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2 border border-border rounded-md"
                  value={timeHHMM}
                  onChange={(e) => setTimeHHMM(e.target.value)}
                />
              </div>
            </div>

            <div className="border border-border rounded-md p-4">
              <div className="text-sm font-semibold mb-3">When</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Date<span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-border rounded-md"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Date{cadence === 'ONCE' ? '' : <span className="text-error">*</span>}
                  </label>
                  <input
                    type="date"
                    disabled={cadence === 'ONCE' || always}
                    className="w-full px-3 py-2 border border-border rounded-md disabled:opacity-50"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <label className="flex items-center gap-2 mt-3 text-sm">
                    <input
                      type="checkbox"
                      checked={cadence === 'ONCE' ? true : always}
                      disabled={cadence === 'ONCE'}
                      onChange={(e) => {
                        setAlways(e.target.checked);
                        if (e.target.checked) setEndDate('');
                      }}
                    />
                    Always
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="px-4 py-2 border border-border rounded-md hover:bg-background disabled:opacity-50"
              >
                {saveMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => runNowMutation.mutate()}
                disabled={runNowMutation.isLoading || !campaignId}
                className="px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-black/80 disabled:opacity-50"
              >
                {runNowMutation.isLoading ? 'Running...' : 'Run now'}
              </button>
            </div>

            {saveMutation.isError ? (
              <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
                {saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}
              </div>
            ) : null}
            {runNowMutation.isError ? (
              <div className="mt-3 p-3 bg-error/10 text-error rounded-md text-sm">
                {runNowMutation.error instanceof Error ? runNowMutation.error.message : 'Run failed'}
              </div>
            ) : null}
            {runNowMutation.isSuccess ? (
              <div className="mt-3 p-3 bg-success/10 text-success rounded-md text-sm">
                Run queued. Broadcast ID: {runNowMutation.data?.broadcastId}
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold mb-2">History</div>
            <div className="text-sm text-secondary-text mb-4">Each “Run now” creates a broadcast record.</div>
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
                  {campaignId && Array.isArray(historyQuery.data?.data) && historyQuery.data.data.length ? (
                    historyQuery.data.data.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 text-sm">{b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : '-'}</td>
                        <td className="px-4 py-2 text-sm">{b.stats?.queued ?? b.stats?.total ?? '-'}</td>
                        <td className="px-4 py-2 text-xs font-mono">{b.id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-secondary-text text-sm">
                        {campaignId ? 'No history yet.' : 'Save campaign to view history.'}
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

