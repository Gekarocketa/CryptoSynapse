import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-medium text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-2.5 flex items-center pointer-events-none text-subtle">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={`w-full h-9 bg-raised text-fg text-sm rounded border border-border px-3 transition-subtle placeholder:text-subtle focus:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'number' ? 'tabular-nums' : ''
            } ${leftIcon ? 'pl-8' : ''} ${rightIcon ? 'pr-8' : ''} ${
              error ? 'border-down focus:border-down focus-visible:ring-down' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-2.5 flex items-center pointer-events-none text-subtle">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-down font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
