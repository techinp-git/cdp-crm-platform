import { useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { customerApi } from '../../services/api';

export function Customer360() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('profile');
  const { data: customer, isLoading } = useQuery(['customer', id], () => customerApi.get(id!));

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const tabs = [
    { id: 'profile', label: 'Profile Info' },
    { id: 'contact', label: 'Contact History' },
    { id: 'purchase', label: 'Purchase History' },
    { id: 'behavior', label: 'Behavior Timeline' },
    { id: 'tags', label: 'Tags & Segments' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base">Customer 360° View</h1>
          <p className="text-secondary-text mt-1">
            {customer?.profile?.firstName} {customer?.profile?.lastName}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            Edit
          </button>
          <button className="bg-background text-base px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary-text hover:text-base hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">
                    First Name
                  </label>
                  <p className="text-base">{customer?.profile?.firstName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">
                    Last Name
                  </label>
                  <p className="text-base">{customer?.profile?.lastName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">Email</label>
                  <p className="text-base">{customer?.identifiers?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">Phone</label>
                  <p className="text-base">{customer?.identifiers?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">Type</label>
                  <p className="text-base">{customer?.type || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-text mb-1">
                    Created
                  </label>
                  <p className="text-base">
                    {customer?.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {customer?.profile && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-secondary-text mb-2">
                    Additional Information
                  </label>
                  <pre className="bg-background p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(customer.profile, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Contact History</h2>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                    <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                      {i % 2 === 0 ? '📧' : '📞'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">
                            {i % 2 === 0 ? 'Email Sent' : 'Phone Call'}
                          </h4>
                          <p className="text-sm text-secondary-text">
                            {i % 2 === 0
                              ? 'Product inquiry follow-up'
                              : 'Follow-up call regarding deal'}
                          </p>
                        </div>
                        <span className="text-sm text-secondary-text">2 hours ago</span>
                      </div>
                      <p className="text-sm text-secondary-text">
                        Status: {i % 2 === 0 ? 'Delivered' : 'Completed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'purchase' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Purchase History</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Order #{1000 + i}</h4>
                      <p className="text-sm text-secondary-text">
                        {i === 1 ? 'Premium Plan' : i === 2 ? 'Enterprise Package' : 'Starter Kit'}
                      </p>
                      <p className="text-sm text-secondary-text">
                        {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">${(i * 99).toFixed(2)}</p>
                      <span className="px-2 py-1 bg-success/10 text-success rounded text-xs">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-background rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Lifetime Value</span>
                  <span className="text-2xl font-bold text-primary">$297.00</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Behavior Timeline</h2>
              <div className="space-y-4">
                {customer?.events?.slice(0, 20).map((event: any, index: number) => (
                  <div key={event.id || index} className="flex items-start gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1 pb-4 border-l-2 border-border pl-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold">{event.type || 'Event'}</h4>
                        <span className="text-sm text-secondary-text">
                          {new Date(event.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      {event.payload && (
                        <p className="text-sm text-secondary-text">
                          {JSON.stringify(event.payload)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {(!customer?.events || customer.events.length === 0) && (
                  <div className="text-center py-8 text-secondary-text">
                    No events recorded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Tags</h2>
                  <button className="text-primary font-medium">+ Add Tag</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer?.tags?.map((tag: any) => (
                    <span
                      key={tag.tag.id}
                      className="px-3 py-1 bg-primary text-base rounded-full text-sm font-medium"
                    >
                      {tag.tag.name}
                    </span>
                  ))}
                  {(!customer?.tags || customer.tags.length === 0) && (
                    <p className="text-secondary-text">No tags assigned</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Segments</h2>
                  <button className="text-primary font-medium">+ Add to Segment</button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <span className="font-medium">VIP Customers</span>
                    <span className="px-2 py-1 bg-success/10 text-success rounded text-xs">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <span className="font-medium">High Value</span>
                    <span className="px-2 py-1 bg-success/10 text-success rounded text-xs">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-secondary-text mb-1">Total Orders</div>
                <div className="text-2xl font-bold">3</div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-1">Total Spent</div>
                <div className="text-2xl font-bold text-primary">$297</div>
              </div>
              <div>
                <div className="text-sm text-secondary-text mb-1">Last Activity</div>
                <div className="text-base font-medium">2 hours ago</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Related Deals</h3>
            <div className="space-y-3">
              <Link
                to="/crm/deals"
                className="block p-3 border border-border rounded-lg hover:bg-background transition"
              >
                <div className="font-medium">Deal #123</div>
                <div className="text-sm text-secondary-text">$5,000</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

