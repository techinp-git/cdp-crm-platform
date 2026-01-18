interface KPICardProps {
  title: string;
  value: number;
}

export function KPICard({ title, value }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-secondary-text mb-2">{title}</h3>
      <p className="text-3xl font-bold text-base">{value.toLocaleString()}</p>
    </div>
  );
}
