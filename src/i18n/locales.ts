export type LocaleCode = 'tr' | 'en' | 'ar';

export interface LocaleMeta {
  code: LocaleCode;
  /** BCP-47 tag used for Intl formatting */
  intl: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  /** preview locales fall back to English strings for untranslated keys */
  status: 'complete' | 'preview';
}

export const LOCALES: LocaleMeta[] = [
  { code: 'tr', intl: 'tr-TR', nativeName: 'Türkçe', dir: 'ltr', status: 'complete' },
  { code: 'en', intl: 'en-US', nativeName: 'English', dir: 'ltr', status: 'complete' },
  { code: 'ar', intl: 'ar', nativeName: 'العربية', dir: 'rtl', status: 'preview' },
];

/** Planned locales — architecture ready, translations not yet supplied. */
export const PLANNED_LOCALES = ['es', 'de', 'fr', 'pt', 'ja'] as const;

export const DEFAULT_LOCALE: LocaleCode = 'tr';

export function getLocaleMeta(code: string): LocaleMeta {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]!;
}

export interface CountryMeta {
  code: string;
  currency: string;
  flag: string;
  names: { tr: string; en: string };
}

export const COUNTRIES: CountryMeta[] = [
  { code: 'TR', currency: 'TRY', flag: '🇹🇷', names: { tr: 'Türkiye', en: 'Türkiye' } },
  { code: 'US', currency: 'USD', flag: '🇺🇸', names: { tr: 'Amerika Birleşik Devletleri', en: 'United States' } },
  { code: 'GB', currency: 'GBP', flag: '🇬🇧', names: { tr: 'Birleşik Krallık', en: 'United Kingdom' } },
  { code: 'DE', currency: 'EUR', flag: '🇩🇪', names: { tr: 'Almanya', en: 'Germany' } },
  { code: 'FR', currency: 'EUR', flag: '🇫🇷', names: { tr: 'Fransa', en: 'France' } },
  { code: 'NL', currency: 'EUR', flag: '🇳🇱', names: { tr: 'Hollanda', en: 'Netherlands' } },
  { code: 'ES', currency: 'EUR', flag: '🇪🇸', names: { tr: 'İspanya', en: 'Spain' } },
  { code: 'IT', currency: 'EUR', flag: '🇮🇹', names: { tr: 'İtalya', en: 'Italy' } },
  { code: 'AE', currency: 'AED', flag: '🇦🇪', names: { tr: 'Birleşik Arap Emirlikleri', en: 'United Arab Emirates' } },
  { code: 'SA', currency: 'SAR', flag: '🇸🇦', names: { tr: 'Suudi Arabistan', en: 'Saudi Arabia' } },
  { code: 'JP', currency: 'JPY', flag: '🇯🇵', names: { tr: 'Japonya', en: 'Japan' } },
  { code: 'BR', currency: 'BRL', flag: '🇧🇷', names: { tr: 'Brezilya', en: 'Brazil' } },
  { code: 'MX', currency: 'MXN', flag: '🇲🇽', names: { tr: 'Meksika', en: 'Mexico' } },
];

export function getCountry(code: string): CountryMeta {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
}
