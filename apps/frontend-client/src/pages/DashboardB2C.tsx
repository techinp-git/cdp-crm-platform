import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, customerApi } from '../services/api';
import { KPICard } from '../components/KPICard';
import { useTenant } from '../contexts/TenantContext';

export function DashboardB2C() {
  const { activeTenant } = useTenant();
  const { data: kpis, isLoading: kpisLoading } = useQuery('dashboard-kpis', analyticsApi.getDashboardKPIs);
  const { data: customers, isLoading: customersLoading } = useQuery('recent-customers', async () => {
    const data = await customerApi.list({ limit: 5 });
    return Array.isArray(data) ? data : data?.data || [];
  });

  const isLoading = kpisLoading || customersLoading;

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">B2C Dashboard</h1>
          {activeTenant && (
            <p className="text-sm text-secondary-text mt-1">{activeTenant.name} - {activeTenant.type}</p>
          )}
        </div>
      </div>
      
      {/* KPI Overview - B2C Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Total Customers" 
          value={kpis?.customers || 0}
        />
        <KPICard 
          title="Active Users" 
          value={kpis?.customers || 0}
        />
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Engagement Rate</h3>
          <p className="text-3xl font-bold text-base">
            68.5%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Growth (30D)</h3>
          <p className="text-3xl font-bold text-success">
            +12.3%
          </p>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="New Customers" value={0} />
        <KPICard title="Active Campaigns" value={0} />
        <KPICard title="Message Sent" value={0} />
        <KPICard title="Conversion Rate" value="2.4%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Customer Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Customer Growth</h2>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1 bg-background rounded">7D</button>
              <button className="text-sm px-3 py-1 bg-primary text-base rounded">30D</button>
              <button className="text-sm px-3 py-1 bg-background rounded">90D</button>
              <button className="text-sm px-3 py-1 bg-background rounded">1Y</button>
            </div>
          </div>
          <div className="h-64 bg-background rounded flex items-center justify-center">
            <p className="text-secondary-text">Customer growth chart will be displayed here</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/cdp/customers"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">➕ Add Customer</div>
              <div className="text-sm text-secondary-text">Create new customer profile</div>
            </Link>
            <Link
              to="/messages/send"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">📨 Send Message</div>
              <div className="text-sm text-secondary-text">Send immediate message</div>
            </Link>
            <Link
              to="/messages/campaign"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">📢 Create Campaign</div>
              <div className="text-sm text-secondary-text">Schedule marketing campaign</div>
            </Link>
            <Link
              to="/cdp/segments"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">🎯 Create Segment</div>
              <div className="text-sm text-secondary-text">Build customer segment</div>
            </Link>
            <Link
              to="/content/line"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">📝 Create Content</div>
              <div className="text-sm text-secondary-text">Design message content</div>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Customers</h2>
            <Link to="/cdp/customers" className="text-primary font-medium text-sm">
              View All →
            </Link>
          </div>
          {customers && customers.length > 0 ? (
            <div className="space-y-3">
              {customers.slice(0, 5).map((customer: any) => (
                <Link
                  key={customer.id}
                  to={`/cdp/customers/${customer.id}`}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-background transition"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {customer.profile?.firstName || 'Customer'} {customer.profile?.lastName || ''}
                    </div>
                    <div className="text-sm text-secondary-text">
                      {customer.identifiers?.email || 'No email'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-secondary-text">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-text">
              <p>No recent customers</p>
              <Link to="/cdp/customers" className="text-primary mt-2 inline-block">
                Add your first customer →
              </Link>
            </div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Campaign Performance</h2>
            <Link to="/messages/campaign" className="text-primary font-medium text-sm">
              View All →
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Active Campaigns</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Messages Sent (Today)</span>
              <span className="font-semibold text-base">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Open Rate</span>
              <span className="font-semibold text-success">0%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Click Rate</span>
              <span className="font-semibold">0%</span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <Link
              to="/messages/campaign"
              className="block w-full text-center px-4 py-2 bg-primary text-base rounded-lg hover:bg-yellow-400 transition"
            >
              📢 Create Campaign →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
