export function OrganizationSettings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Organization Settings</h1>
      
      {/* Company Profile */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Company Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Industry</label>
            <select className="w-full px-3 py-2 border border-border rounded-md">
              <option>Select industry</option>
              <option>Retail</option>
              <option>E-commerce</option>
              <option>Services</option>
              <option>Manufacturing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
        <button className="mt-4 bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
          Save Changes
        </button>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Branding</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Logo</label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-sm text-secondary-text mb-2">
                Upload your company logo
              </p>
              <button className="text-primary font-medium">Choose File</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex gap-4">
              <input
                type="color"
                className="w-20 h-10 border border-border rounded"
                defaultValue="#FCD34D"
              />
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-border rounded-md"
                placeholder="#FCD34D"
              />
            </div>
          </div>
        </div>
        <button className="mt-4 bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
          Save Branding
        </button>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Business Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md"
              rows={3}
              placeholder="Enter business address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <select className="w-full px-3 py-2 border border-border rounded-md">
                <option>Select country</option>
                <option>United States</option>
                <option>Thailand</option>
                <option>United Kingdom</option>
              </select>
            </div>
          </div>
        </div>
        <button className="mt-4 bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
          Save Information
        </button>
      </div>
    </div>
  );
}
