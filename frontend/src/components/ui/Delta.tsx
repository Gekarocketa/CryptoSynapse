import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPercent } from '../../lib/format';

export interface DeltaProps {
  value: number | null | undefined;
  lang?: string;
  pill?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Delta: React.FC<DeltaProps> = ({
  value,
  lang,
  pill = false,
  size = 'md',
  className = '',
}) => {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className="text-subtle tabular-nums font-mono text-xs">0.00%</span>;
  }

  const isUp = value > 0;
  const isZero = value === 0;

  const colorClass = isZero ? 'text-muted' : isUp ? 'text-up' : 'text-down';
  const bgClass = pill
    ? isZero
      ? 'bg-hover px-1.5 py-0.5 rounded border border-border'
      : isUp
      ? 'bg-[#2ebd851f] px-1.5 py-0.5 rounded border border-[#2ebd8533]'
      : 'bg-[#f0616d1f] px-1.5 py-0.5 rounded border border-[#f0616d33]'
    : '';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular-nums ${colorClass} ${bgClass} ${textSize} ${className}`}
    >
      {isZero ? (
        <Minus className={`${iconSize} shrink-0`} />
      ) : isUp ? (
        <TrendingUp className={`${iconSize} shrink-0`} />
      ) : (
        <TrendingDown className={`${iconSize} shrink-0`} />
      )}
      <span>{formatPercent(value, lang, { includeSign: true })}</span>
    </span>
  );
};
