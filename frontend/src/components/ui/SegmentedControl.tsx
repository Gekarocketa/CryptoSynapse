import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  const containerHeight = size === 'sm' ? 'h-7 p-0.5' : 'h-8 p-1';
  const itemClass = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1';

  return (
    <div
      role="group"
      className={`inline-flex items-center bg-raised border border-border rounded ${containerHeight} select-none ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-full inline-flex items-center justify-center font-medium rounded transition-subtle cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${itemClass} ${
              isSelected
                ? 'bg-surface text-fg border border-border shadow-sm'
                : 'text-muted hover:text-fg border border-transparent'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
