export function Integrations() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Integrations</h1>
      
      {/* E-commerce */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">E-commerce Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">🛒</div>
            <h3 className="font-semibold mb-2">Shopify</h3>
            <p className="text-sm text-secondary-text mb-4">
              Sync products, orders, and customers
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">🛍️</div>
            <h3 className="font-semibold mb-2">WooCommerce</h3>
            <p className="text-sm text-secondary-text mb-4">
              Integrate with WordPress store
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-semibold mb-2">Magento</h3>
            <p className="text-sm text-secondary-text mb-4">
              Connect Magento store
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Payment Gateways</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">💳</div>
            <h3 className="font-semibold mb-2">Stripe</h3>
            <p className="text-sm text-secondary-text mb-4">
              Process payments and subscriptions
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold mb-2">PayPal</h3>
            <p className="text-sm text-secondary-text mb-4">
              Accept PayPal payments
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* Marketing Tools */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Marketing Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">📧</div>
            <h3 className="font-semibold mb-2">Mailchimp</h3>
            <p className="text-sm text-secondary-text mb-4">
              Sync email campaigns
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Google Analytics</h3>
            <p className="text-sm text-secondary-text mb-4">
              Track website analytics
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold mb-2">Facebook Pixel</h3>
            <p className="text-sm text-secondary-text mb-4">
              Track conversions
            </p>
            <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* API Webhooks */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">API Webhooks</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Create Webhook
          </button>
        </div>
        <div className="space-y-3">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Customer Created</h4>
                <p className="text-sm text-secondary-text">https://example.com/webhook/customer</p>
              </div>
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">
                Active
              </span>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">Deal Won</h4>
                <p className="text-sm text-secondary-text">https://example.com/webhook/deal</p>
              </div>
              <span className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm">
                Paused
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
