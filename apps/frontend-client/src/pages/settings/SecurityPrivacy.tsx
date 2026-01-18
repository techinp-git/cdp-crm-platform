export function SecurityPrivacy() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Security & Privacy</h1>
      
      {/* API Keys */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Generate API Key
          </button>
        </div>
        <div className="space-y-3">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Production API Key</h4>
                <p className="text-sm text-secondary-text font-mono">sk_live_••••••••••••••••</p>
                <p className="text-xs text-secondary-text mt-1">Created: Jan 1, 2024</p>
              </div>
              <button className="text-error font-medium">Revoke</button>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Test API Key</h4>
                <p className="text-sm text-secondary-text font-mono">sk_test_••••••••••••••••</p>
                <p className="text-xs text-secondary-text mt-1">Created: Jan 1, 2024</p>
              </div>
              <button className="text-error font-medium">Revoke</button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Export/Backup */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Data Export/Backup</h2>
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="font-semibold">Export Customer Data</h4>
                <p className="text-sm text-secondary-text">
                  Download all customer data in CSV format
                </p>
              </div>
              <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
                Export
              </button>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="font-semibold">Full Database Backup</h4>
                <p className="text-sm text-secondary-text">
                  Create a complete backup of all data
                </p>
              </div>
              <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
                Backup Now
              </button>
            </div>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <label className="text-sm">
                Automatically backup data every week
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Compliance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">GDPR Compliance Tools</h2>
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-semibold mb-2">Right to Access</h4>
            <p className="text-sm text-secondary-text mb-3">
              Export all personal data for a specific customer
            </p>
            <input
              type="email"
              className="w-full px-3 py-2 border border-border rounded-md mb-3"
              placeholder="Enter customer email"
            />
            <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Export Data
            </button>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-semibold mb-2">Right to Erasure</h4>
            <p className="text-sm text-secondary-text mb-3">
              Permanently delete all personal data for a customer
            </p>
            <input
              type="email"
              className="w-full px-3 py-2 border border-border rounded-md mb-3"
              placeholder="Enter customer email"
            />
            <button className="bg-error text-white font-medium py-2 px-4 rounded-md hover:bg-red-600">
              Delete Data
            </button>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-semibold mb-2">Data Processing Consent</h4>
            <p className="text-sm text-secondary-text mb-3">
              Manage customer consent for data processing
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <label className="text-sm">Marketing communications</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <label className="text-sm">Analytics tracking</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <label className="text-sm">Third-party sharing</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
