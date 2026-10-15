import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'surface' | 'raised';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      actions,
      padding = 'md',
      variant = 'surface',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const bgClass = variant === 'surface' ? 'bg-surface' : 'bg-raised';

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    };

    const hasHeader = title || actions || subtitle;

    return (
      <div
        ref={ref}
        className={`rounded-md border border-border ${bgClass} transition-subtle ${className}`}
        {...props}
      >
        {hasHeader && (
          <div className="flex items-start justify-between gap-4 p-5 pb-0">
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-fg tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-muted mt-0.5 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        )}
        <div className={paddingClasses[padding]}>{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';
