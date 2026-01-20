import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

type RangeKey = '7D' | '30D' | '90D';

export function CdpDashboard() {
  const { activeTenant } = useTenant();
  const [range, setRange] = useState<RangeKey>('30D');

  const kpis = useMemo(() => {
    if (range === '7D') {
      return {
        audience: 125430,
        reachable: 98350,
        engaged: 28740,
        conversion: 1.95,
      };
    }
    if (range === '90D') {
      return {
        audience: 162880,
        reachable: 121560,
        engaged: 40210,
        conversion: 2.35,
      };
    }
    return {
      audience: 145220,
      reachable: 110420,
      engaged: 33480,
      conversion: 2.10,
    };
  }, [range]);

  const growth = useMemo(() => {
    const base =
      range === '7D'
        ? [
            { day: 'D-6', customers: 121000, newCustomers: 820 },
            { day: 'D-5', customers: 121600, newCustomers: 760 },
            { day: 'D-4', customers: 122150, newCustomers: 910 },
            { day: 'D-3', customers: 122900, newCustomers: 1120 },
            { day: 'D-2', customers: 123780, newCustomers: 980 },
            { day: 'D-1', customers: 124500, newCustomers: 740 },
            { day: 'Today', customers: 125430, newCustomers: 990 },
          ]
        : range === '90D'
          ? [
              { day: 'W1', customers: 132000, newCustomers: 4800 },
              { day: 'W2', customers: 136200, newCustomers: 5200 },
              { day: 'W3', customers: 140600, newCustomers: 5600 },
              { day: 'W4', customers: 145300, newCustomers: 5900 },
              { day: 'W5', customers: 149900, newCustomers: 6100 },
              { day: 'W6', customers: 154400, newCustomers: 6300 },
              { day: 'W7', customers: 158700, newCustomers: 5900 },
              { day: 'W8', customers: 162880, newCustomers: 6100 },
            ]
          : [
              { day: 'W1', customers: 118500, newCustomers: 4200 },
              { day: 'W2', customers: 121900, newCustomers: 4800 },
              { day: 'W3', customers: 125600, newCustomers: 5100 },
              { day: 'W4', customers: 129800, newCustomers: 5600 },
              { day: 'W5', customers: 133400, newCustomers: 5200 },
              { day: 'W6', customers: 137900, newCustomers: 6100 },
              { day: 'W7', customers: 141700, newCustomers: 5400 },
              { day: 'W8', customers: 145220, newCustomers: 5000 },
            ];
    return base;
  }, [range]);

  const segmentSizes = useMemo(
    () => [
      { name: 'VIP', size: 3200, lift: 4.8 },
      { name: 'High Intent', size: 12500, lift: 3.1 },
      { name: 'Cart Abandon', size: 9800, lift: 2.7 },
      { name: 'New Users', size: 14600, lift: 1.8 },
      { name: 'Dormant', size: 22100, lift: 0.9 },
    ],
    [],
  );

  const channelReach = useMemo(
    () => [
      { name: 'Email', value: 42.0, color: '#3B82F6' },
      { name: 'SMS', value: 18.5, color: '#F59E0B' },
      { name: 'LINE', value: 24.0, color: '#22C55E' },
      { name: 'Messenger', value: 15.5, color: '#2563EB' },
    ],
    [],
  );

  const campaignPerformance = useMemo(
    () => [
      { name: 'Welcome Series', sent: 12000, openRate: 41.2, clickRate: 6.8 },
      { name: 'Cart Recovery', sent: 8400, openRate: 38.6, clickRate: 9.2 },
      { name: 'VIP Exclusive', sent: 3100, openRate: 55.1, clickRate: 12.5 },
      { name: 'Re-Engage', sent: 9200, openRate: 22.4, clickRate: 3.1 },
    ],
    [],
  );

  const topSegments = useMemo(
    () => [
      { name: 'VIP', size: 3200, reachable: 2980, recommendedChannel: 'LINE', lastRun: '2d ago' },
      { name: 'High Intent', size: 12500, reachable: 10120, recommendedChannel: 'Email', lastRun: '5d ago' },
      { name: 'Cart Abandon', size: 9800, reachable: 8420, recommendedChannel: 'Email', lastRun: '1d ago' },
      { name: 'New Users', size: 14600, reachable: 12110, recommendedChannel: 'Messenger', lastRun: '7d ago' },
      { name: 'Dormant', size: 22100, reachable: 16840, recommendedChannel: 'SMS', lastRun: '14d ago' },
    ],
    [],
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">CDP Dashboard</h1>
          {activeTenant ? (
            <div className="text-sm text-secondary-text mt-1">
              {activeTenant.name} • Marketing overview (mock data)
            </div>
          ) : (
            <div className="text-sm text-secondary-text mt-1">Marketing overview (mock data)</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-secondary-text">Range</div>
          <div className="flex gap-2">
            {(['7D', '30D', '90D'] as RangeKey[]).map((k) => (
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
        <KpiCard title="Total Audience" value={formatNumber(kpis.audience)} hint="+10.9% vs last period" accent="green" />
        <KpiCard title="Reachable (by channel IDs)" value={formatNumber(kpis.reachable)} hint="Email/Phone/LINE/PSID" accent="blue" />
        <KpiCard title="Engaged Users" value={formatNumber(kpis.engaged)} hint="events/visits/clicks" accent="green" />
        <KpiCard title="Conversion Rate" value={formatPct(kpis.conversion)} hint="purchase / engaged" accent="amber" />
      </div>

      {/* Growth + Segment lift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard
          title="Audience Growth"
          right={
            <div className="text-sm text-secondary-text">
              Tip: ต่อ API จริงจาก events + orders ได้ทีหลัง
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(value: any, key: any) => {
                    if (key === 'customers') return [formatNumber(Number(value)), 'Customers'];
                    return [formatNumber(Number(value)), 'New'];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="customers" name="Customers" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.55} />
                <Area type="monotone" dataKey="newCustomers" name="New" stroke="#10B981" fill="#A7F3D0" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Segment Size & Lift (mock)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentSizes} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Number(v).toFixed(1)}x`} />
                <Tooltip
                  formatter={(value: any, key: any) => {
                    if (key === 'size') return [formatNumber(Number(value)), 'Segment size'];
                    return [`${Number(value).toFixed(1)}x`, 'Lift'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="size" name="Size" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="lift" name="Lift" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Channels + Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Reachable Channel Mix">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelReach} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {channelReach.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard
            title="Campaign Performance (mock)"
            right={
              <Link to="/messages/send" className="text-primary font-medium text-sm">
                Send Immediate →
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-base uppercase tracking-wider">Campaign</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Sent</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Open</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-base uppercase tracking-wider">Click</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border">
                  {campaignPerformance.map((c) => (
                    <tr key={c.name} className="hover:bg-background">
                      <td className="px-4 py-2 text-sm font-medium text-base">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatNumber(c.sent)}</td>
                      <td className="px-4 py-2 text-sm text-right text-success">{formatPct(c.openRate)}</td>
                      <td className="px-4 py-2 text-sm text-right text-blue-600">{formatPct(c.clickRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Top segments table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Segments for Marketing</h2>
          <Link to="/cdp/segments" className="text-primary font-medium text-sm">
            Manage Segments →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Segment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Reachable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Recommended</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {topSegments.map((s) => (
                <tr key={s.name} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">{s.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(s.size)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-success">{formatNumber(s.reachable)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{s.recommendedChannel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-text">{s.lastRun}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      to="/messages/send/new"
                      className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/80"
                    >
                      Create Send
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

