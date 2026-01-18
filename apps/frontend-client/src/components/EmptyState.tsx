interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No Access',
  message = "You don't have permission to view this content.",
  icon,
  action,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-16 h-16 text-gray-400 mx-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="mb-4">{icon || defaultIcon}</div>
      <h3 className="text-lg font-semibold text-base mb-2">{title}</h3>
      <p className="text-secondary-text max-w-md mb-4">{message}</p>
      {action && <div className="mt-4">{action}</div>}
      <p className="text-sm text-gray-400 mt-6">
        If you believe this is an error, please contact your administrator.
      </p>
    </div>
  );
}
