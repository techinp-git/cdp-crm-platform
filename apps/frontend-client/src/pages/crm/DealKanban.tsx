import { useQuery } from 'react-query';
import { analyticsApi } from '../../services/api';

export function DealKanban() {
  const { data: pipeline, isLoading } = useQuery('deal-pipeline', analyticsApi.getDealPipeline);

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-base mb-6">Deals Pipeline</h1>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {pipeline?.map((stage: any) => (
          <div key={stage.id} className="flex-shrink-0 w-80 bg-background rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-base">{stage.name}</h2>
              <span className="text-sm text-secondary-text">{stage.deals.length}</span>
            </div>
            <div className="space-y-2">
              {stage.deals.map((deal: any) => (
                <div key={deal.id} className="bg-white rounded p-3 shadow-sm">
                  <p className="font-medium text-sm">{deal.title}</p>
                  <p className="text-xs text-secondary-text mt-1">
                    {deal.customer?.profile?.firstName} {deal.customer?.profile?.lastName}
                  </p>
                  {deal.amount && (
                    <p className="text-sm font-semibold text-primary mt-2">
                      ${(Number(deal.amount) / 1000).toFixed(1)}K
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
