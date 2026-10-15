import React from 'react';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  subline?: React.ReactNode;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({ label, value, subline, className = '' }) => {
  return (
    <div className={`flex flex-col justify-center py-1 px-2 ${className}`}>
      <span className="text-xs font-normal text-muted truncate">
        {label}
      </span>
      <div className="text-2xl font-semibold text-fg tracking-tight tabular-nums mt-1 truncate">
        {value}
      </div>
      {subline && (
        <div className="text-xs text-muted mt-1 truncate flex items-center gap-1.5 font-normal">
          {subline}
        </div>
      )}
    </div>
  );
};
