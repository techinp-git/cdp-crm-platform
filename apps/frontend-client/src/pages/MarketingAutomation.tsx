export function MarketingAutomation() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Marketing Automation</h1>
      
      {/* Campaign Builder */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Campaign Builder</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Create Campaign
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">📧</div>
            <h3 className="font-semibold mb-2">Email Campaign</h3>
            <p className="text-sm text-secondary-text">
              Create and send email campaigns
            </p>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold mb-2">SMS Campaign</h3>
            <p className="text-sm text-secondary-text">
              Send bulk SMS messages
            </p>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold mb-2">Push Notification</h3>
            <p className="text-sm text-secondary-text">
              Send push notifications
            </p>
          </div>
        </div>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <button className="text-primary font-medium">+ New Template</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="bg-background h-32 rounded mb-3"></div>
              <h4 className="font-semibold mb-1">Template {i}</h4>
              <p className="text-sm text-secondary-text">Last used: Never</p>
            </div>
          ))}
        </div>
      </div>

      {/* Automation Workflows */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Automation Workflows</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Create Workflow
          </button>
        </div>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Welcome Email Series</h4>
                <p className="text-sm text-secondary-text">
                  Send welcome emails to new customers
                </p>
              </div>
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">
                Active
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-background px-2 py-1 rounded">Trigger: New Customer</span>
              <span className="text-xs bg-background px-2 py-1 rounded">3 emails</span>
            </div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Abandoned Cart Reminder</h4>
                <p className="text-sm text-secondary-text">
                  Remind customers about abandoned carts
                </p>
              </div>
              <span className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm">
                Paused
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-background px-2 py-1 rounded">Trigger: Cart Abandoned</span>
              <span className="text-xs bg-background px-2 py-1 rounded">2 emails</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Analytics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Campaign Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">0</div>
            <div className="text-sm text-secondary-text">Total Campaigns</div>
          </div>
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-2xl font-bold text-success mb-1">0%</div>
            <div className="text-sm text-secondary-text">Open Rate</div>
          </div>
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">0%</div>
            <div className="text-sm text-secondary-text">Click Rate</div>
          </div>
          <div className="text-center p-4 bg-background rounded-lg">
            <div className="text-2xl font-bold text-warning mb-1">0%</div>
            <div className="text-sm text-secondary-text">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
