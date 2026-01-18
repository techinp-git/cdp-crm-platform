export function TeamManagement() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Team Management</h1>
      
      {/* User Management */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">User Management</h2>
          <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            + Invite User
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-base font-semibold">
                  U{i}
                </div>
                <div>
                  <h4 className="font-semibold">User {i}</h4>
                  <p className="text-sm text-secondary-text">user{i}@example.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-background rounded-full text-sm">Admin</span>
                <button className="text-primary font-medium">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles & Permissions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Roles & Permissions</h2>
          <button className="text-primary font-medium">+ Create Role</button>
        </div>
        <div className="space-y-3">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold">Admin</h4>
                <p className="text-sm text-secondary-text">Full access to all features</p>
              </div>
              <button className="text-primary font-medium">Edit</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-background px-2 py-1 rounded">customer:read</span>
              <span className="text-xs bg-background px-2 py-1 rounded">customer:write</span>
              <span className="text-xs bg-background px-2 py-1 rounded">deal:read</span>
              <span className="text-xs bg-background px-2 py-1 rounded">deal:write</span>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold">Sales Manager</h4>
                <p className="text-sm text-secondary-text">Manage deals and customers</p>
              </div>
              <button className="text-primary font-medium">Edit</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-background px-2 py-1 rounded">deal:read</span>
              <span className="text-xs bg-background px-2 py-1 rounded">deal:write</span>
              <span className="text-xs bg-background px-2 py-1 rounded">customer:read</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Hierarchy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Team Hierarchy</h2>
        <div className="border border-border rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-semibold">
                CEO
              </div>
              <span className="font-medium">CEO</span>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center text-sm">
                  SM
                </div>
                <span>Sales Manager</span>
              </div>
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center text-sm">
                    SR
                  </div>
                  <span>Sales Rep</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className="mt-4 text-primary font-medium">Edit Hierarchy</button>
      </div>
    </div>
  );
}
