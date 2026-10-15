/**
 * Isolated Price Series Generator.
 * Can easily be swapped with a real historical market API endpoint later.
 */

export const TIMEFRAME_RANGES = ['15m', '1h', '4h', '12h', '1d', '7d'] as const;
export type TimeframeRange = (typeof TIMEFRAME_RANGES)[number];

export interface ChartDataPoint {
  name: string;
  tooltipLabel?: string;
  price: number;
  timestamp: number;
  sentiment?: number | null;
}

/**
 * Returns historical price points for the selected timeframe step.
 * Steps: 15m, 1h, 4h, 12h, 1d, 7d.
 * If price is 0 or invalid, returns an empty array to trigger the EmptyState.
 */
export function getPriceSeries(
  currentPrice: number,
  timeframe: string,
  lang?: string
): ChartDataPoint[] {
  if (!currentPrice || currentPrice <= 0 || isNaN(currentPrice)) {
    return [];
  }

  const locale = lang?.startsWith('pl') ? 'pl-PL' : lang?.startsWith('uk') ? 'uk-UA' : 'en-US';
  const now = new Date();

  let pointsCount = 24;
  let timeStepSeconds = 3600; // default 1h
  let volatility = 0.03;

  switch (timeframe) {
    case '15m': {
      // Step: 15 minutes, rounded to 15m mark
      const mins = now.getMinutes();
      now.setMinutes(mins - (mins % 15), 0, 0);
      pointsCount = 24; // last 6 hours
      timeStepSeconds = 15 * 60; // 900s
      volatility = 0.015;
      break;
    }
    case '1h': {
      // Step: 1 hour, rounded to top of hour
      now.setMinutes(0, 0, 0);
      pointsCount = 24; // last 24 hours
      timeStepSeconds = 3600;
      volatility = 0.03;
      break;
    }
    case '4h': {
      // Step: 4 hours, rounded to nearest 4h boundary
      const hours = now.getHours();
      now.setHours(hours - (hours % 4), 0, 0, 0);
      pointsCount = 24; // last 4 days
      timeStepSeconds = 4 * 3600;
      volatility = 0.055;
      break;
    }
    case '12h': {
      // Step: 12 hours, rounded to 00:00 or 12:00
      const hours = now.getHours();
      now.setHours(hours < 12 ? 0 : 12, 0, 0, 0);
      pointsCount = 20; // last 10 days
      timeStepSeconds = 12 * 3600;
      volatility = 0.085;
      break;
    }
    case '1d':
    case '1D': {
      // Step: 1 day, rounded to midnight
      now.setHours(0, 0, 0, 0);
      pointsCount = 30; // last 30 days
      timeStepSeconds = 86400;
      volatility = 0.12;
      break;
    }
    case '7d':
    case '7D': {
      // Step: 7 days (1 week)
      now.setHours(0, 0, 0, 0);
      pointsCount = 16; // last ~4 months
      timeStepSeconds = 7 * 86400;
      volatility = 0.18;
      break;
    }
    default: {
      now.setMinutes(0, 0, 0);
      pointsCount = 24;
      timeStepSeconds = 3600;
      volatility = 0.03;
    }
  }

  const data: ChartDataPoint[] = [];

  for (let i = pointsCount - 1; i >= 0; i--) {
    const pointDate = new Date(now.getTime() - i * timeStepSeconds * 1000);

    let axisLabel = '';
    let tooltipLabel = '';

    if (timeframe === '15m') {
      const timeStr = pointDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      axisLabel = timeStr;
      tooltipLabel = timeStr;
    } else if (timeframe === '1h') {
      const timeStr = pointDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      axisLabel = timeStr;
      tooltipLabel = timeStr;
    } else if (timeframe === '4h') {
      const dateStr = pointDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const timeStr = pointDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      axisLabel = `${dateStr} ${timeStr}`;
      tooltipLabel = `${dateStr}, ${timeStr}`;
    } else if (timeframe === '12h') {
      const dateStr = pointDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const timeStr = pointDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
      axisLabel = `${dateStr} ${timeStr}`;
      tooltipLabel = `${dateStr}, ${timeStr}`;
    } else if (timeframe === '1d' || timeframe === '1D') {
      const dateStr = pointDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      axisLabel = dateStr;
      tooltipLabel = pointDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      const dateStr = pointDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      axisLabel = dateStr;
      tooltipLabel = dateStr;
    }

    // Deterministic wave fluctuation
    const sineVal = Math.sin(i * 0.7);
    const cosVal = Math.cos(i * 1.1);
    const wave = sineVal * 0.6 + cosVal * 0.4;

    const factor = 1 + wave * volatility * (i / (pointsCount || 1));
    const price = Math.round(currentPrice * factor * 100) / 100;

    data.push({
      name: axisLabel,
      tooltipLabel,
      price: price > 0 ? price : currentPrice,
      timestamp: pointDate.getTime(),
    });
  }

  return data;
}
