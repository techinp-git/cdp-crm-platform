export function Support() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Support & Help</h1>
      
      {/* Knowledge Base */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Knowledge Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <p className="text-sm text-secondary-text">
              Learn the basics of using the platform
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold mb-2">Customer Management</h3>
            <p className="text-sm text-secondary-text">
              How to manage customer profiles
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="font-semibold mb-2">CRM Features</h3>
            <p className="text-sm text-secondary-text">
              Managing deals and leads
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">🔌</div>
            <h3 className="font-semibold mb-2">Integrations</h3>
            <p className="text-sm text-secondary-text">
              Connect third-party services
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="font-semibold mb-2">Settings</h3>
            <p className="text-sm text-secondary-text">
              Configure your account
            </p>
          </div>
          <div className="border border-border rounded-lg p-4 hover:shadow-md transition">
            <div className="text-3xl mb-3">❓</div>
            <h3 className="font-semibold mb-2">FAQs</h3>
            <p className="text-sm text-secondary-text">
              Frequently asked questions
            </p>
          </div>
        </div>
        <div className="mt-4">
          <input
            type="search"
            className="w-full px-4 py-2 border border-border rounded-md"
            placeholder="Search knowledge base..."
          />
        </div>
      </div>

      {/* Video Tutorials */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Video Tutorials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-background h-48 flex items-center justify-center">
              <div className="text-6xl">▶️</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Platform Overview</h3>
              <p className="text-sm text-secondary-text">5:23</p>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-background h-48 flex items-center justify-center">
              <div className="text-6xl">▶️</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Setting Up Your First Campaign</h3>
              <p className="text-sm text-secondary-text">8:45</p>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-background h-48 flex items-center justify-center">
              <div className="text-6xl">▶️</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Customer Segmentation</h3>
              <p className="text-sm text-secondary-text">6:12</p>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-background h-48 flex items-center justify-center">
              <div className="text-6xl">▶️</div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Deal Pipeline Management</h3>
              <p className="text-sm text-secondary-text">7:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Contact Support</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Get Help</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="text-2xl">📧</div>
                <div>
                  <h4 className="font-medium">Email Support</h4>
                  <p className="text-sm text-secondary-text">support@ydm-platform.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="text-2xl">💬</div>
                <div>
                  <h4 className="font-medium">Live Chat</h4>
                  <p className="text-sm text-secondary-text">Available 24/7</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="text-2xl">📞</div>
                <div>
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-secondary-text">+1 (555) 123-4567</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Submit a Ticket</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="What can we help you with?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md"
                  rows={4}
                  placeholder="Describe your issue..."
                />
              </div>
              <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
