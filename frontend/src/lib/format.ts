/**
 * Locale-aware formatting utilities using standard Intl APIs.
 * Supports 'en', 'pl', and 'uk' language keys mapped to their standard BCP 47 locales.
 */

export function getLocale(lang?: string): string {
  if (!lang) return 'en-US';
  const clean = lang.toLowerCase();
  if (clean.startsWith('pl')) return 'pl-PL';
  if (clean.startsWith('uk')) return 'uk-UA';
  return 'en-US';
}

/**
 * Formats a currency value in USD according to the active language locale.
 */
export function formatPrice(
  value: number | null | undefined,
  lang?: string,
  options?: { minDecimals?: number; maxDecimals?: number }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  const locale = getLocale(lang);
  const minDecimals = options?.minDecimals ?? (value < 1 && value > 0 ? 4 : 2);
  const maxDecimals = options?.maxDecimals ?? (value < 1 && value > 0 ? 6 : 2);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/**
 * Compact notation for chart axes and metrics (e.g. $84K, $1.2M).
 */
export function formatCompactPrice(value: number | null | undefined, lang?: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  const locale = getLocale(lang);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formats a percentage value (e.g. +1.27% or -0.50%) with locale decimal separator.
 */
export function formatPercent(
  value: number | null | undefined,
  lang?: string,
  options?: { includeSign?: boolean; decimals?: number }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }

  const locale = getLocale(lang);
  const decimals = options?.decimals ?? 2;
  const includeSign = options?.includeSign ?? true;

  const formattedNum = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const sign = value > 0 ? (includeSign ? '+' : '') : value < 0 ? '-' : '';
  return `${sign}${formattedNum}%`;
}

/**
 * Formats a date using the active locale.
 */
export function formatDate(
  dateInput: string | number | Date,
  lang?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const locale = getLocale(lang);
  const defaultOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOpts).format(date);
}

/**
 * Formats a time using the active locale (24h format for PL/UK, 12/24h standard).
 */
export function formatTime(
  dateInput: string | number | Date,
  lang?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const locale = getLocale(lang);
  const defaultOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en-US' ? false : false,
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOpts).format(date);
}

/**
 * Formats relative time (e.g., "5 min ago", "2 hours ago").
 */
export function formatRelative(dateInput: string | number | Date, lang?: string): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const locale = getLocale(lang);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDay > 30) {
    return formatDate(date, lang, { month: 'short', day: 'numeric' });
  }
  if (diffDay >= 1) {
    return rtf.format(-diffDay, 'day');
  }
  if (diffHour >= 1) {
    return rtf.format(-diffHour, 'hour');
  }
  if (diffMin >= 1) {
    return rtf.format(-diffMin, 'minute');
  }
  return rtf.format(-Math.max(1, diffSec), 'second');
}
