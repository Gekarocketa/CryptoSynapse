import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        compact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
    >
      {icon && <div className="text-subtle mb-3 shrink-0">{icon}</div>}
      <h4 className="text-sm font-medium text-fg">{title}</h4>
      {description && (
        <p className="text-xs text-muted max-w-sm mt-1 font-normal leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
