export function CommunicationHub() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Communication Hub</h1>
      
      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-4xl mb-4">📧</div>
          <h3 className="font-semibold mb-2">Email Integration</h3>
          <p className="text-sm text-secondary-text mb-4">
            Connect Gmail, Outlook, or other email providers
          </p>
          <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Connect
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="font-semibold mb-2">SMS Campaigns</h3>
          <p className="text-sm text-secondary-text mb-4">
            Send SMS messages to customers
          </p>
          <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Setup
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="font-semibold mb-2">WhatsApp</h3>
          <p className="text-sm text-secondary-text mb-4">
            Integrate WhatsApp Business API
          </p>
          <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Connect
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="font-semibold mb-2">Voice Calls</h3>
          <p className="text-sm text-secondary-text mb-4">
            Make and track phone calls
          </p>
          <button className="w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Setup
          </button>
        </div>
      </div>

      {/* Communication History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Communication History</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              📧
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">Email to John Doe</h4>
                  <p className="text-sm text-secondary-text">Product inquiry follow-up</p>
                </div>
                <span className="text-sm text-secondary-text">2 hours ago</span>
              </div>
              <p className="text-sm text-secondary-text">
                Sent via Gmail integration
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              💬
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">SMS to Jane Smith</h4>
                  <p className="text-sm text-secondary-text">Appointment reminder</p>
                </div>
                <span className="text-sm text-secondary-text">1 day ago</span>
              </div>
              <p className="text-sm text-secondary-text">
                Delivered successfully
              </p>
            </div>
          </div>
        </div>
        <button className="mt-4 text-primary font-medium">
          View All Communications →
        </button>
      </div>
    </div>
  );
}
