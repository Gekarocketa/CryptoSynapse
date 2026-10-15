import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'up' | 'down' | 'neutral' | 'accent' | 'warning';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2 py-0.5 leading-snug',
  };

  const variantStyles = {
    up: 'bg-[#2ebd851f] text-up border-[#2ebd8533]',
    down: 'bg-[#f0616d1f] text-down border-[#f0616d33]',
    neutral: 'bg-hover text-muted border-border',
    accent: 'bg-[#5b8def1f] text-accent border-[#5b8def33]',
    warning: 'bg-[#e5a93d1f] text-warning border-[#e5a93d33]',
  };

  const dotStyles = {
    up: 'bg-up',
    down: 'bg-down',
    neutral: 'bg-muted',
    accent: 'bg-accent',
    warning: 'bg-warning',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border tabular-nums ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]} shrink-0`} />}
      <span>{children}</span>
    </span>
  );
};
