interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value);
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{displayValue}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
