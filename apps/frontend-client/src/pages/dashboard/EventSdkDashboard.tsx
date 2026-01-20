import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0);
}

function formatPct(n: number) {
  return `${(Number(n) || 0).toFixed(1)}%`;
}

function KpiCard(props: { title: string; value: string; hint?: string; accent?: 'green' | 'blue' | 'amber' | 'slate' }) {
  const accent = props.accent || 'blue';
  const topRight =
    accent === 'green'
      ? 'text-success'
      : accent === 'amber'
        ? 'text-yellow-600'
        : accent === 'slate'
          ? 'text-secondary-text'
          : 'text-blue-500';
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-secondary-text">{props.title}</div>
        <div className={`text-xs font-semibold ${topRight}`}>{props.hint || ''}</div>
      </div>
      <div className="text-3xl font-bold text-base">{props.value}</div>
    </div>
  );
}

function SectionCard(props: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{props.title}</h2>
        {props.right ? <div>{props.right}</div> : null}
      </div>
      {props.children}
    </div>
  );
}

type RangeKey = '24H' | '7D' | '30D';

export function EventSdkDashboard() {
  const { activeTenant } = useTenant();
  const [range, setRange] = useState<RangeKey>('7D');

  const kpis = useMemo(() => {
    if (range === '24H') {
      return {
        events: 286000,
        dau: 21450,
        newUsers: 1860,
        conversion: 1.6,
      };
    }
    if (range === '30D') {
      return {
        events: 8900000,
        dau: 46200,
        newUsers: 28400,
        conversion: 2.3,
      };
    }
    return {
      events: 2300000,
      dau: 32100,
      newUsers: 9400,
      conversion: 2.0,
    };
  }, [range]);

  const eventTrend = useMemo(() => {
    if (range === '24H') {
      return Array.from({ length: 12 }).map((_, idx) => {
        const hour = `${(idx * 2).toString().padStart(2, '0')}:00`;
        return { t: hour, events: 16000 + idx * 700 + (idx % 3) * 1200, users: 900 + idx * 35 + (idx % 2) * 80 };
      });
    }
    if (range === '30D') {
      return Array.from({ length: 10 }).map((_, idx) => ({
        t: `W${idx + 1}`,
        events: 650000 + idx * 18000 + (idx % 2) * 24000,
        users: 32000 + idx * 900 + (idx % 3) * 1400,
      }));
    }
    return [
      { t: 'D-6', events: 260000, users: 29800 },
      { t: 'D-5', events: 285000, users: 30200 },
      { t: 'D-4', events: 310000, users: 31400 },
      { t: 'D-3', events: 340000, users: 32500 },
      { t: 'D-2', events: 355000, users: 32900 },
      { t: 'D-1', events: 370000, users: 33400 },
      { t: 'Today', events: 380000, users: 34100 },
    ];
  }, [range]);

  const topEvents = useMemo(
    () => [
      { name: 'page_view', count: 980000, uniqUsers: 84200, convImpact: 0.2 },
      { name: 'product_view', count: 420000, uniqUsers: 51600, convImpact: 0.6 },
      { name: 'add_to_cart', count: 120000, uniqUsers: 18400, convImpact: 1.4 },
      { name: 'begin_checkout', count: 54000, uniqUsers: 9200, convImpact: 2.1 },
      { name: 'purchase', count: 16800, uniqUsers: 7400, convImpact: 3.8 },
    ],
    [],
  );

  const funnel = useMemo(
    () => [
      { stage: 'Visit', value: 234567 },
      { stage: 'Product View', value: 145200 },
      { stage: 'Add to Cart', value: 58200 },
      { stage: 'Checkout', value: 31400 },
      { stage: 'Purchase', value: 9800 },
    ],
    [],
  );

  const channelMix = useMemo(
    () => [
      { name: 'Website', value: 52.6, color: '#3B82F6' },
      { name: 'Mobile App', value: 28.9, color: '#10B981' },
      { name: 'Facebook', value: 10.0, color: '#2563EB' },
      { name: 'LINE', value: 8.5, color: '#22C55E' },
    ],
    [],
  );

  const utmSnapshot = useMemo(
    () => [
      { source: 'facebook', medium: 'cpc', campaign: 'new-year-boost', users: 12450, purchases: 620, cv: 5.0 },
      { source: 'google', medium: 'cpc', campaign: 'search-brand', users: 9800, purchases: 520, cv: 5.3 },
      { source: 'line', medium: 'oa', campaign: 'vip-promo', users: 4200, purchases: 310, cv: 7.4 },
      { source: 'email', medium: 'newsletter', campaign: 'weekly-deals', users: 6800, purchases: 210, cv: 3.1 },
    ],
    [],
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Event/SDK Dashboard</h1>
          <div className="text-sm text-secondary-text mt-1">
            {activeTenant ? `${activeTenant.name} • ` : ''}Event analytics (mock data)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-secondary-text">Range</div>
          <div className="flex gap-2">
            {(['24H', '7D', '30D'] as RangeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`text-sm px-3 py-1 rounded ${range === k ? 'bg-primary text-base' : 'bg-background'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard title="Total Events" value={formatNumber(kpis.events)} hint="+8.1% vs last period" accent="blue" />
        <KpiCard title="Active Users (DAU)" value={formatNumber(kpis.dau)} hint="unique users" accent="green" />
        <KpiCard title="New Users" value={formatNumber(kpis.newUsers)} hint="first seen" accent="green" />
        <KpiCard title="Purchase Conversion" value={formatPct(kpis.conversion)} hint="purchase / active" accent="amber" />
      </div>

      {/* Trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard
          title="Events & Active Users Trend"
          right={
            <Link to="/data/events" className="text-primary font-medium text-sm">
              View Event Logs →
            </Link>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eventTrend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis yAxisId="left" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(value: any, key: any) => {
                    if (key === 'events') return [formatNumber(Number(value)), 'Events'];
                    return [formatNumber(Number(value)), 'Users'];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="events" name="Events" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Journey Funnel (mock)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatNumber(Number(v))} />
                <YAxis type="category" dataKey="stage" width={110} />
                <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
                <Bar dataKey="value" fill="#60A5FA" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, idx) => (
                    <Cell key={idx} fill="#3B82F6" opacity={1 - idx * 0.12} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-secondary-text">
            ตัวอย่าง funnel สำหรับทีม marketing: Visit → View → Add to cart → Checkout → Purchase
          </div>
        </SectionCard>
      </div>

      {/* Top events + Channel mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Top Events (mock)">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Event</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Users</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Impact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {topEvents.map((e) => (
                  <tr key={e.name} className="hover:bg-background">
                    <td className="px-4 py-2 text-sm font-medium text-base">{e.name}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatNumber(e.count)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatNumber(e.uniqUsers)}</td>
                    <td className="px-4 py-2 text-sm text-right text-success">{formatPct(e.convImpact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Channel Mix (from events)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {channelMix.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="SDK Health (mock)">
          <div className="space-y-4">
            <div className="p-3 bg-background rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-base">Event Schema Coverage</div>
                <div className="text-xs text-secondary-text">tracked / recommended</div>
              </div>
              <div className="text-lg font-semibold text-success">86%</div>
            </div>
            <div className="p-3 bg-background rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-base">Dedup Rate</div>
                <div className="text-xs text-secondary-text">duplicate events filtered</div>
              </div>
              <div className="text-lg font-semibold">3.2%</div>
            </div>
            <div className="p-3 bg-background rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-base">Latency (p95)</div>
                <div className="text-xs text-secondary-text">client → pipeline</div>
              </div>
              <div className="text-lg font-semibold">1.4s</div>
            </div>
            <div className="pt-2">
              <Link to="/cdp/integration" className="text-primary font-medium text-sm">
                Integration setup →
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* UTM snapshot */}
      <SectionCard
        title="UTM Snapshot (mock)"
        right={
          <span className="text-sm text-secondary-text">
            ใช้สำหรับดู performance ตาม source/medium/campaign
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Medium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Purchases</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">CVR</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {utmSnapshot.map((u) => (
                <tr key={`${u.source}-${u.medium}-${u.campaign}`} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">{u.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{u.medium}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{u.campaign}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(u.users)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(u.purchases)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-success">{formatPct(u.cv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

