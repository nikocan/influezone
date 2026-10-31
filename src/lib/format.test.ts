import { formatCurrency, formatCompact, formatRelative } from './format';
import { translate } from '@/i18n/I18nProvider';
import { tr } from '@/i18n/tr';
import { en } from '@/i18n/en';

describe('locale formatting', () => {
  it('formats currencies with locale rules', () => {
    expect(formatCurrency(1299.5, 'TRY', 'tr-TR')).toMatch(/1\.299,50/);
    expect(formatCurrency(1299.5, 'USD', 'en-US')).toBe('$1,299.50');
    expect(formatCurrency(1500, 'JPY', 'en-US')).toBe('¥1,500');
  });
  it('formats compact numbers per locale', () => {
    expect(formatCompact(48210, 'en-US')).toBe('48.2K');
    expect(formatCompact(48210, 'tr-TR')).toMatch(/48,2/);
  });
  it('formats relative time', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    expect(formatRelative('2026-10-31T10:00:00Z', 'en-US', now)).toMatch(/2 hr/);
  });
});

describe('i18n dictionaries', () => {
  const keys = (o: object, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${p}${k}`] : keys(v as object, `${p}${k}.`)));
  it('English has exactly the same keys as Turkish', () => {
    expect(keys(en).sort()).toEqual(keys(tr).sort());
  });
  it('no Turkish string is empty except intentional blanks', () => {
    const blanks = keys(tr).filter((k) => !translate('tr', k as never));
    expect(blanks.every((k) => k.startsWith('disclosure.none') || k.startsWith('phases.'))).toBe(true);
  });
  it('interpolates variables and falls back to English for preview locales', () => {
    expect(translate('tr', 'social.likesCount', { n: 5 })).toBe('5 beğenme');
    expect(translate('ar', 'nav.home')).toBe('الرئيسية');
    expect(translate('ar', 'auth.signIn')).toBe('Sign in');
  });
});
