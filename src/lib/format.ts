/** Locale-aware formatting helpers. Currencies are never converted or summed across codes here. */

export function formatCurrency(amount: number, currency: string, intlLocale: string): string {
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(n: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale).format(n);
}

export function formatCompact(n: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDate(iso: string | Date, intlLocale: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(intlLocale, opts).format(d);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(iso: string, intlLocale: string, now: Date = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto', style: 'short' });
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff), 'second');
}
