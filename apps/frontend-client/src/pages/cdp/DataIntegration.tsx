export function DataIntegration() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Data Integration</h1>
      
      {/* Import Data */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Import Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-semibold mb-2">CSV Import</h3>
            <p className="text-sm text-secondary-text mb-4">
              Import customer data from CSV files
            </p>
            <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Upload CSV
            </button>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔌</div>
            <h3 className="font-semibold mb-2">API Integration</h3>
            <p className="text-sm text-secondary-text mb-4">
              Connect via REST API
            </p>
            <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Setup API
            </button>
          </div>
        </div>
      </div>

      {/* Connected Sources */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Connected Sources</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center">
                🛒
              </div>
              <div>
                <h3 className="font-semibold">E-commerce Platform</h3>
                <p className="text-sm text-secondary-text">Shopify, WooCommerce, etc.</p>
              </div>
            </div>
            <button className="text-primary font-medium">Connect</button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center">
                💳
              </div>
              <div>
                <h3 className="font-semibold">POS System</h3>
                <p className="text-sm text-secondary-text">Point of Sale integration</p>
              </div>
            </div>
            <button className="text-primary font-medium">Connect</button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center">
                📧
              </div>
              <div>
                <h3 className="font-semibold">Email Marketing</h3>
                <p className="text-sm text-secondary-text">Mailchimp, SendGrid, etc.</p>
              </div>
            </div>
            <button className="text-primary font-medium">Connect</button>
          </div>
        </div>
      </div>

      {/* Data Mapping */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Data Mapping</h2>
        <p className="text-secondary-text mb-4">
          Map fields from your data sources to customer profile fields.
        </p>
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm text-secondary-text text-center py-8">
            Data mapping interface will be displayed here
          </p>
        </div>
        <button className="mt-4 bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
          Create Mapping
        </button>
      </div>
    </div>
  );
}
