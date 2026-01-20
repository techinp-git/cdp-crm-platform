import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

export function TenantTypeGuard(props: {
  allowed: string[];
  children: ReactNode;
  redirectTo?: string;
}) {
  const { activeTenant, isLoading } = useTenant();

  if (isLoading || !activeTenant) {
    return (
      <div className="text-center py-12 text-secondary-text">
        Loading...
      </div>
    );
  }

  const t = String(activeTenant.type || '').toUpperCase();
  const ok = props.allowed.map((x) => String(x).toUpperCase()).includes(t);
  if (!ok) return <Navigate to={props.redirectTo || '/dashboard'} replace />;

  return <>{props.children}</>;
}

