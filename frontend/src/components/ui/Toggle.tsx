import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const switchWidth = size === 'sm' ? 'w-8 h-4.5' : 'w-10 h-5.5';
  const knobSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';
  const translateClass = size === 'sm' ? (checked ? 'translate-x-3.5' : 'translate-x-0.5') : (checked ? 'translate-x-4.5' : 'translate-x-0.5');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span
              onClick={() => !disabled && onChange(!checked)}
              className={`text-xs font-medium text-fg select-none ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-muted font-normal select-none mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex items-center rounded-full transition-colors cursor-pointer shrink-0 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed ${switchWidth} ${
          checked ? 'bg-accent' : 'bg-hover border-border'
        }`}
      >
        <span
          className={`inline-block transform rounded-full bg-white transition-transform duration-150 ease-in-out shadow-sm ${knobSize} ${translateClass}`}
        />
      </button>
    </div>
  );
};
