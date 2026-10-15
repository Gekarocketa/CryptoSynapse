import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity } from 'lucide-react';
import { Card, Button, SegmentedControl, Delta, EmptyState } from './ui';
import { formatPrice, formatCompactPrice } from '../lib/format';
import { TIMEFRAME_RANGES } from '../lib/chartData';
import type { Coin } from '../App';
import type { ChartDataPoint } from '../lib/chartData';

export interface PriceChartProps {
  coin: Coin | null;
  chartData: ChartDataPoint[];
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onSync: () => void;
  showSentimentOverlay?: boolean;
  onToggleSentimentOverlay?: () => void;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  coin,
  chartData,
  timeframe,
  onTimeframeChange,
  onSync,
  showSentimentOverlay = false,
  onToggleSentimentOverlay,
}) => {
  const { t, i18n } = useTranslation();
  const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null);

  const hasData = coin && coin.currentPrice > 0 && chartData.length > 0;

  // Determine if any point has real sentiment data and overlay is enabled
  const hasRealSentimentData =
    Boolean(showSentimentOverlay) && chartData.some((p) => p.sentiment !== undefined && p.sentiment !== null);

  const displayPrice = hoveredData ? hoveredData.price : coin?.currentPrice ?? 0;

  // Clean, uncrowded tick intervals for each timeframe
  const getXAxisInterval = (tf: string): number => {
    switch (tf) {
      case '15m': return 3; // 24 points -> every 4th point (1h ticks)
      case '1h': return 3;  // 24 points -> every 4th point (4h ticks)
      case '4h': return 5;  // 24 points -> every 6th point (24h ticks)
      case '12h': return 1; // 20 points -> every 2nd point (daily ticks)
      case '1d':
      case '1D': return 4;  // 30 points -> every 5th point (5-day ticks)
      case '7d':
      case '7D': return 1;  // 16 points -> every 2nd point (2-week ticks)
      default: return 3;
    }
  };

  return (
    <Card className="flex flex-col h-[400px]">
      {/* Chart Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-fg tracking-tight">
                {coin ? coin.name : t('selectCoin')}
              </h2>
              {coin && (
                <span className="text-xs font-mono font-medium text-muted uppercase">
                  {coin.symbol}
                </span>
              )}
            </div>
            {coin && (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-semibold text-fg tabular-nums tracking-tight">
                  {formatPrice(displayPrice, i18n.language)}
                </span>
                <Delta value={coin.priceChange24h} lang={i18n.language} pill={true} size="sm" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleSentimentOverlay && (
            <button
              type="button"
              onClick={onToggleSentimentOverlay}
              className={`h-7 px-2.5 rounded text-xs font-medium border transition-subtle flex items-center gap-1.5 cursor-pointer select-none ${
                showSentimentOverlay
                  ? 'bg-accent-subtle border-accent text-accent font-semibold'
                  : 'bg-surface border-border text-muted hover:text-fg hover:bg-hover'
              }`}
              title={t('showSentimentChartLabel')}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${showSentimentOverlay ? 'bg-accent' : 'bg-muted'}`} />
              <span className="hidden sm:inline">AI Sentiment</span>
            </button>
          )}

          {/* Range Segmented Control: 1D 7D 1M 3M 1Y */}
          <SegmentedControl
            size="sm"
            value={timeframe}
            onChange={onTimeframeChange}
            options={TIMEFRAME_RANGES.map((r) => ({ value: r, label: r }))}
          />
        </div>
      </div>

      {/* Chart Canvas or EmptyState */}
      <div className="w-full h-[300px] pt-4 relative">
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (state?.activePayload && state.activePayload.length > 0) {
                  setHoveredData(state.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => setHoveredData(null)}
            >
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines only */}
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />

              <XAxis
                dataKey="name"
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
                interval={getXAxisInterval(timeframe)}
              />

              <YAxis
                yAxisId="price"
                domain={['auto', 'auto']}
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-4}
                tickFormatter={(val) => formatCompactPrice(val, i18n.language)}
              />

              {hasRealSentimentData && (
                <YAxis
                  yAxisId="sentiment"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="var(--muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={4}
                  tickFormatter={(val) => `${val}%`}
                />
              )}

              {/* Custom Tooltip styled like a Card */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-surface border border-border-strong rounded p-2.5 shadow-xl text-xs space-y-1">
                        <div className="text-muted font-normal">{data.tooltipLabel || data.name}</div>
                        <div className="text-sm font-semibold text-fg tabular-nums">
                          {formatPrice(data.price, i18n.language)}
                        </div>
                        {data.sentiment !== undefined && data.sentiment !== null && (
                          <div className="text-[11px] text-muted flex items-center justify-between gap-3 pt-1 border-t border-border">
                            <span>{t('sentiment')}:</span>
                            <span className="font-medium text-fg tabular-nums">
                              {data.sentiment}/100
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="var(--accent)"
                strokeWidth={1.5}
                fill="url(#chartAreaGradient)"
                isAnimationActive={false}
              />

              {hasRealSentimentData && (
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#818cf8', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#818cf8' }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            compact={true}
            icon={<Activity className="h-8 w-8 text-subtle" />}
            title={t('noPriceData')}
            description={t('syncToLoad')}
            action={
              <Button size="sm" variant="primary" onClick={onSync}>
                {t('syncData')}
              </Button>
            }
          />
        )}
      </div>
    </Card>
  );
};
