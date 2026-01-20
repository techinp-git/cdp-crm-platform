import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type PropertyOption = { id: string; label: string };

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0);
}

function formatCurrencyTHB(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(n) || 0);
}

function KpiCard(props: { title: string; value: string; subtitle?: string; delta?: string; accent?: 'green' | 'blue' | 'amber' }) {
  const accent = props.accent || 'blue';
  const topRight =
    accent === 'green' ? 'text-success' : accent === 'amber' ? 'text-yellow-600' : 'text-blue-500';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-secondary-text">{props.title}</div>
        <div className={`text-sm font-semibold ${topRight}`}>{props.subtitle || ''}</div>
      </div>
      <div className="text-3xl font-bold text-base">{props.value}</div>
      {props.delta ? <div className="text-sm text-secondary-text mt-2">{props.delta}</div> : null}
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

export function CustomerOrderDcpDashboard() {
  const properties: PropertyOption[] = useMemo(
    () => [
      { id: '9898018836', label: '9898018836' },
      { id: '1029348571', label: '1029348571' },
      { id: 'A-TEST-001', label: 'A-TEST-001' },
    ],
    [],
  );
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');

  const trend = useMemo(
    () => [
      { month: 'Jan', customers: 105000, orders: 2800, eventsK: 2100 },
      { month: 'Feb', customers: 110200, orders: 3200, eventsK: 2400 },
      { month: 'Mar', customers: 113700, orders: 3450, eventsK: 2800 },
      { month: 'Apr', customers: 116800, orders: 3900, eventsK: 3300 },
      { month: 'May', customers: 119400, orders: 4300, eventsK: 3800 },
      { month: 'Jun', customers: 121900, orders: 4600, eventsK: 4100 },
      { month: 'Jul', customers: 123600, orders: 4950, eventsK: 4550 },
      { month: 'Aug', customers: 124800, orders: 5200, eventsK: 4900 },
      { month: 'Sep', customers: 125600, orders: 5400, eventsK: 5200 },
      { month: 'Oct', customers: 126100, orders: 5600, eventsK: 5600 },
      { month: 'Nov', customers: 126900, orders: 5850, eventsK: 6100 },
      { month: 'Dec', customers: 127500, orders: 6000, eventsK: 6500 },
    ],
    [],
  );

  const funnel = useMemo(
    () => [
      { stage: 'Awareness', value: 234567 },
      { stage: 'Interest', value: 123456 },
      { stage: 'Consideration', value: 87654 },
      { stage: 'Purchase', value: 45678 },
      { stage: 'Retention', value: 34567 },
    ],
    [],
  );

  const segmentation = useMemo(
    () => [
      { name: 'VIP', value: 2.0, color: '#F59E0B' },
      { name: 'Regular', value: 71.3, color: '#3B82F6' },
      { name: 'New', value: 9.8, color: '#10B981' },
      { name: 'Inactive', value: 17.9, color: '#6B7280' },
    ],
    [],
  );

  const orderStatus = useMemo(
    () => [
      { name: 'Completed', value: 92.7, color: '#10B981' },
      { name: 'Pending', value: 4.9, color: '#F59E0B' },
      { name: 'Cancelled', value: 2.4, color: '#EF4444' },
    ],
    [],
  );

  const channelDistribution = useMemo(
    () => [
      { name: 'Website', value: 52.6, color: '#3B82F6' },
      { name: 'Mobile App', value: 28.9, color: '#10B981' },
      { name: 'Facebook', value: 10.0, color: '#2563EB' },
      { name: 'LINE', value: 8.5, color: '#22C55E' },
    ],
    [],
  );

  const topCustomers = useMemo(
    () => [
      { rank: 1, id: '01cb34f1-c810-584c-a...', name: 'John Doe', orders: 45, revenue: 123450, events: 234 },
      { rank: 2, id: '02db4592-d921-695d-b...', name: 'Jane Smith', orders: 38, revenue: 98760, events: 198 },
      { rank: 3, id: '03ec56b3-e032-7a6e-c...', name: 'Bob Johnson', orders: 32, revenue: 87650, events: 167 },
      { rank: 4, id: '04fd6714-f143-8b7f-d...', name: 'Alice Brown', orders: 28, revenue: 76540, events: 145 },
      { rank: 5, id: '05ge78j5-g254-9c8g-e...', name: 'Charlie Wilson', orders: 25, revenue: 65430, events: 123 },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm text-secondary-text">Home • Customer, Order &amp; DCP Dashboard</div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2">
          <h1 className="text-2xl font-bold text-base">Customer, Order &amp; DCP Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-secondary-text">Property ID</div>
            <select
              className="px-4 py-2 border border-border rounded-lg bg-white"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard title="Customer" value={formatNumber(125430)} subtitle="Customer" delta="+10.9% vs last period" accent="green" />
        <KpiCard title="Order" value={formatNumber(45678)} subtitle="Order" delta={`Revenue: ${formatCurrencyTHB(12600000)}`} accent="green" />
        <KpiCard title="DCP" value={formatNumber(2300000)} subtitle="DCP" delta="26.2 events/user" accent="blue" />
        <KpiCard title="CLV" value={formatNumber(9900)} subtitle="CLV" delta="ROI: 2100.0%" accent="amber" />
      </div>

      {/* Trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Customer, Order & DCP Trend (12 Months)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(value: any, key: any) => {
                    if (key === 'customers') return [formatNumber(Number(value)), 'Customers'];
                    if (key === 'orders') return [formatNumber(Number(value)), 'Orders'];
                    return [formatNumber(Number(value)), 'Events (K)'];
                  }}
                />
                <Legend />
                <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="eventsK" name="Events (K)" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="customers" name="Customers" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Customer Journey Funnel">
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
        </SectionCard>
      </div>

      {/* Donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Customer Segmentation">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segmentation} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {segmentation.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Order Status Distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={orderStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {orderStatus.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="DCP Channel Distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {channelDistribution.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Top customers table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Top Customers by Order Value (Customer + Order + DCP Data)</h2>
          </div>
          <div className="text-sm text-secondary-text">Property: {propertyId}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-base uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-base uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {topCustomers.map((c) => (
                <tr key={c.rank} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600">{c.rank}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-text">{c.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-base">{c.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(c.orders)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-success">{formatCurrencyTHB(c.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(c.events)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/80">
                      View Profile
                    </button>
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

