import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { analyticsApi, dealApi } from '../services/api';
import { KPICard } from '../components/KPICard';
import { useTenant } from '../contexts/TenantContext';

export function DashboardB2B() {
  const { activeTenant } = useTenant();
  const { data: kpis, isLoading: kpisLoading } = useQuery('dashboard-kpis', analyticsApi.getDashboardKPIs);
  const { data: pipeline, isLoading: pipelineLoading } = useQuery('deal-pipeline', analyticsApi.getDealPipeline);
  const { data: recentDeals, isLoading: dealsLoading } = useQuery('recent-deals', async () => {
    const deals = await dealApi.list({ limit: 5 });
    return Array.isArray(deals) ? deals : deals?.data || [];
  });

  const isLoading = kpisLoading || pipelineLoading;

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const totalDealValue = kpis?.totalDealValue || 0;
  const wonDealValue = kpis?.wonDealsValue || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">B2B Dashboard</h1>
          {activeTenant && (
            <p className="text-sm text-secondary-text mt-1">{activeTenant.name} - {activeTenant.type}</p>
          )}
        </div>
      </div>
      
      {/* KPI Overview - B2B Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Active Leads" 
          value={kpis?.activeLeads || 0}
        />
        <KPICard 
          title="Open Deals" 
          value={kpis?.openDeals || 0}
        />
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Pipeline Value</h3>
          <p className="text-3xl font-bold text-base">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(totalDealValue) || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-secondary-text mb-2">Won Deals Value</h3>
          <p className="text-3xl font-bold text-success">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(wonDealValue) || 0)}
          </p>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <KPICard title="Total Customers" value={kpis?.customers || 0} />
        <KPICard title="Accounts" value={kpis?.accounts || 0} />
        <KPICard title="Contacts" value={kpis?.contacts || 0} />
        <KPICard title="Pending Activities" value={kpis?.pendingActivities || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Deal Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Deal Pipeline</h2>
            <Link to="/crm/deals" className="text-primary font-medium text-sm">
              View All →
            </Link>
          </div>
          {pipeline && pipeline.length > 0 ? (
            <div className="space-y-4">
              {pipeline.slice(0, 5).map((stage: any) => (
                <div key={stage.id} className="border-l-4 border-primary pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{stage.name}</h3>
                    <span className="text-sm text-secondary-text">
                      {stage.deals?.length || 0} deals
                    </span>
                  </div>
                  <div className="text-sm text-secondary-text mb-1">
                    Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(stage.totalValue) || 0)}
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min((stage.probability || 0), 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-secondary-text mt-1">
                    Win Probability: {stage.probability || 0}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-text">
              <p>No pipeline data available</p>
              <Link to="/crm/deals" className="text-primary mt-2 inline-block">
                Create your first deal →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/crm/leads"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">🎫 Create Lead</div>
              <div className="text-sm text-secondary-text">Add a new lead</div>
            </Link>
            <Link
              to="/crm/deals"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">💼 New Deal</div>
              <div className="text-sm text-secondary-text">Start a new deal</div>
            </Link>
            <Link
              to="/crm/accounts"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">🏢 Add Account</div>
              <div className="text-sm text-secondary-text">Create company account</div>
            </Link>
            <Link
              to="/crm/contacts"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">👤 Add Contact</div>
              <div className="text-sm text-secondary-text">Add contact person</div>
            </Link>
            <Link
              to="/crm/activities"
              className="block p-3 bg-background rounded-lg hover:bg-primary/10 transition"
            >
              <div className="font-medium">📅 Schedule Activity</div>
              <div className="text-sm text-secondary-text">Create a task or meeting</div>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Deals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Deals</h2>
            <Link to="/crm/deals" className="text-primary font-medium text-sm">
              View All →
            </Link>
          </div>
          {recentDeals && recentDeals.length > 0 ? (
            <div className="space-y-3">
              {recentDeals.slice(0, 5).map((deal: any) => (
                <Link
                  key={deal.id}
                  to={`/crm/deals`}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-background transition"
                >
                  <div className="flex-1">
                    <div className="font-medium">{deal.title || `Deal ${deal.id.substring(0, 8)}`}</div>
                    {deal.customer && (
                      <div className="text-sm text-secondary-text">{deal.customer.profile?.firstName || 'Customer'}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-base">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.currency || 'USD', maximumFractionDigits: 0 }).format(Number(deal.amount) || 0)}
                    </div>
                    {deal.expectedCloseDate && (
                      <div className="text-xs text-secondary-text">
                        {new Date(deal.expectedCloseDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-text">
              <p>No recent deals</p>
              <Link to="/crm/deals" className="text-primary mt-2 inline-block">
                Create your first deal →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Stats</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Pipeline Stages</span>
              <span className="font-semibold">{pipeline?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Total Deal Value</span>
              <span className="font-semibold text-base">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(totalDealValue) || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Won Deal Value</span>
              <span className="font-semibold text-success">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(wonDealValue) || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-secondary-text">Win Rate</span>
              <span className="font-semibold">
                {totalDealValue && wonDealValue ? 
                  `${((Number(wonDealValue) / (Number(totalDealValue) + Number(wonDealValue))) * 100).toFixed(1)}%` : 
                  '0%'}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <Link
              to="/crm/activities"
              className="block w-full text-center px-4 py-2 bg-primary text-base rounded-lg hover:bg-yellow-400 transition"
            >
              📅 View All Activities →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
