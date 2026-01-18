export function CustomerAnalytics() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Customer Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* RFM Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">RFM Analysis</h2>
          <p className="text-secondary-text mb-4">
            Recency, Frequency, Monetary analysis to segment customers by value.
          </p>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="font-medium">Champions</span>
              <span className="text-primary font-bold">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="font-medium">Loyal Customers</span>
              <span className="text-primary font-bold">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="font-medium">At Risk</span>
              <span className="text-warning font-bold">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="font-medium">Lost</span>
              <span className="text-error font-bold">0</span>
            </div>
          </div>
          <button className="mt-4 w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Run RFM Analysis
          </button>
        </div>

        {/* Customer Lifetime Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Lifetime Value (CLV)</h2>
          <p className="text-secondary-text mb-4">
            Predict and analyze customer lifetime value.
          </p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-secondary-text">Average CLV</span>
                <span className="text-2xl font-bold text-primary">$0</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-secondary-text">Top 10% CLV</span>
                <span className="text-xl font-semibold text-success">$0</span>
              </div>
            </div>
          </div>
          <button className="mt-4 w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Calculate CLV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Prediction */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Churn Prediction</h2>
          <p className="text-secondary-text mb-4">
            Identify customers at risk of churning.
          </p>
          <div className="space-y-3">
            <div className="p-4 border-l-4 border-error bg-error/5">
              <div className="flex justify-between items-center">
                <span className="font-medium">High Risk</span>
                <span className="text-error font-bold">0 customers</span>
              </div>
            </div>
            <div className="p-4 border-l-4 border-warning bg-warning/5">
              <div className="flex justify-between items-center">
                <span className="font-medium">Medium Risk</span>
                <span className="text-warning font-bold">0 customers</span>
              </div>
            </div>
            <div className="p-4 border-l-4 border-success bg-success/5">
              <div className="flex justify-between items-center">
                <span className="font-medium">Low Risk</span>
                <span className="text-success font-bold">0 customers</span>
              </div>
            </div>
          </div>
          <button className="mt-4 w-full bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
            Run Churn Analysis
          </button>
        </div>

        {/* Cohort Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Cohort Analysis</h2>
          <p className="text-secondary-text mb-4">
            Analyze customer retention by acquisition cohort.
          </p>
          <div className="bg-background rounded p-4 mb-4">
            <p className="text-sm text-secondary-text text-center">
              Cohort analysis chart will be displayed here
            </p>
          </div>
          <div className="flex gap-2">
            <select className="flex-1 px-3 py-2 border border-border rounded-md">
              <option>Monthly Cohorts</option>
              <option>Weekly Cohorts</option>
              <option>Quarterly Cohorts</option>
            </select>
            <button className="bg-primary text-base font-medium py-2 px-4 rounded-md hover:bg-yellow-400">
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
