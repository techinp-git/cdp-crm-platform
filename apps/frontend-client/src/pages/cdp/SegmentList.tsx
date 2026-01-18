import { useState } from 'react';
import { Link } from 'react-router-dom';

export function SegmentList() {
  const [activeTab, setActiveTab] = useState('saved');
  const [showBuilder, setShowBuilder] = useState(false);

  const tabs = [
    { id: 'saved', label: 'Saved Segments' },
    { id: 'dynamic', label: 'Dynamic Segments' },
    { id: 'analytics', label: 'Segment Analytics' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-base">Segmentation</h1>
        <button
          onClick={() => setShowBuilder(true)}
          className="bg-primary text-base px-4 py-2 rounded-md font-medium hover:bg-yellow-400"
        >
          + Create Segment
        </button>
      </div>

      {/* Segment Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Segment Builder</h2>
                <button
                  onClick={() => setShowBuilder(false)}
                  className="text-secondary-text hover:text-base"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Segment Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md"
                  placeholder="e.g., VIP Customers"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md"
                  rows={3}
                  placeholder="Describe this segment..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Segment Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" value="static" defaultChecked />
                    Static Segment
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" value="dynamic" />
                    Dynamic Segment (Auto-update)
                  </label>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Build Segment (Drag & Drop)</label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 min-h-[300px]">
                  <div className="text-center text-secondary-text mb-4">
                    Drag conditions here to build your segment
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className="text-2xl">📊</div>
                      <div className="flex-1">
                        <select className="w-full px-3 py-2 border border-border rounded-md">
                          <option>Total Purchase Amount</option>
                          <option>Number of Orders</option>
                          <option>Last Purchase Date</option>
                        </select>
                      </div>
                      <select className="px-3 py-2 border border-border rounded-md">
                        <option>Greater than</option>
                        <option>Less than</option>
                        <option>Equals</option>
                      </select>
                      <input
                        type="text"
                        className="w-32 px-3 py-2 border border-border rounded-md"
                        placeholder="Value"
                      />
                    </div>
                    <div className="text-center">
                      <button className="text-primary font-medium">+ Add Condition</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBuilder(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-background"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary text-base rounded-md font-medium hover:bg-yellow-400">
                  Create Segment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
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
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'VIP Customers', count: 125, type: 'Static' },
            { name: 'High Value', count: 342, type: 'Static' },
            { name: 'At Risk', count: 89, type: 'Static' },
            { name: 'New Customers', count: 567, type: 'Static' },
            { name: 'Loyal Customers', count: 234, type: 'Static' },
            { name: 'Inactive', count: 156, type: 'Static' },
          ].map((segment, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{segment.name}</h3>
                  <p className="text-sm text-secondary-text">{segment.type} Segment</p>
                </div>
                <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                  {segment.count} customers
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-sm px-3 py-2 bg-background rounded hover:bg-gray-100">
                  View
                </button>
                <button className="flex-1 text-sm px-3 py-2 bg-background rounded hover:bg-gray-100">
                  Edit
                </button>
                <button className="text-sm px-3 py-2 bg-background rounded hover:bg-gray-100">
                  ⋮
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'dynamic' && (
        <div className="space-y-4">
          {[
            { name: 'Active Last 30 Days', count: 1234, update: 'Auto-updates daily' },
            { name: 'High Purchase Frequency', count: 567, update: 'Auto-updates hourly' },
            { name: 'Churn Risk', count: 89, update: 'Auto-updates daily' },
          ].map((segment, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{segment.name}</h3>
                    <span className="px-2 py-1 bg-success/10 text-success rounded text-xs">
                      Dynamic
                    </span>
                  </div>
                  <p className="text-sm text-secondary-text">{segment.update}</p>
                </div>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full font-medium">
                  {segment.count} customers
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-sm px-4 py-2 bg-primary text-base rounded font-medium hover:bg-yellow-400">
                  View Customers
                </button>
                <button className="text-sm px-4 py-2 bg-background rounded hover:bg-gray-100">
                  Edit Rules
                </button>
                <button className="text-sm px-4 py-2 bg-background rounded hover:bg-gray-100">
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-secondary-text mb-2">Total Segments</div>
              <div className="text-3xl font-bold">12</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-secondary-text mb-2">Total Customers</div>
              <div className="text-3xl font-bold">2,456</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-secondary-text mb-2">Avg Segment Size</div>
              <div className="text-3xl font-bold">205</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-secondary-text mb-2">Most Used</div>
              <div className="text-lg font-semibold">VIP Customers</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Segment Performance</h3>
            <div className="h-64 bg-background rounded flex items-center justify-center">
              <p className="text-secondary-text">Segment performance chart will be displayed here</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Segment Overlap</h3>
            <div className="h-64 bg-background rounded flex items-center justify-center">
              <p className="text-secondary-text">Segment overlap visualization will be displayed here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

