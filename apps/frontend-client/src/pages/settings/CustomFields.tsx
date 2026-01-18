export function CustomFields() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Custom Fields</h1>
      
      {/* Customer Fields */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Customer Fields</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Add Field
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-semibold">Loyalty Points</h4>
              <p className="text-sm text-secondary-text">Number • Required</p>
            </div>
            <button className="text-primary font-medium">Edit</button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-semibold">Preferred Language</h4>
              <p className="text-sm text-secondary-text">Select • Optional</p>
            </div>
            <button className="text-primary font-medium">Edit</button>
          </div>
        </div>
      </div>

      {/* Deal Fields */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Deal Fields</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Add Field
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-semibold">Contract Type</h4>
              <p className="text-sm text-secondary-text">Select • Optional</p>
            </div>
            <button className="text-primary font-medium">Edit</button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h4 className="font-semibold">Renewal Date</h4>
              <p className="text-sm text-secondary-text">Date • Optional</p>
            </div>
            <button className="text-primary font-medium">Edit</button>
          </div>
        </div>
      </div>

      {/* Field Validation Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Field Validation Rules</h2>
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-semibold mb-2">Email Validation</h4>
            <p className="text-sm text-secondary-text mb-3">
              Ensure email addresses are in valid format
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-background rounded-full text-sm">Applied to: Email fields</span>
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">Active</span>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-semibold mb-2">Phone Number Format</h4>
            <p className="text-sm text-secondary-text mb-3">
              Standardize phone number format
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-background rounded-full text-sm">Applied to: Phone fields</span>
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">Active</span>
            </div>
          </div>
        </div>
        <button className="mt-4 text-primary font-medium">+ Add Validation Rule</button>
      </div>
    </div>
  );
}
