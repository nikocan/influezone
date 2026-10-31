import { COUNTRIES, LOCALES, type LocaleCode } from '@/i18n/locales';
import { Select } from '@/components/ui/input';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { cn } from '@/lib/utils';

export function LanguageSelector({ id, className }: { id?: string; className?: string }) {
  const { prefs, setPrefs } = usePreferences();
  const { t } = useI18n();
  return (
    <Select id={id} className={className} value={prefs.locale} onChange={(e) => setPrefs({ locale: e.currentTarget.value as LocaleCode })} aria-label={t('settings.language')}>
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>{l.nativeName}{l.status === 'preview' ? ` (${t('settings.previewLocale')})` : ''}</option>
      ))}
    </Select>
  );
}

export function CountrySelector({ id, className, value, onChange }: { id?: string; className?: string; value?: string; onChange?: (c: string) => void }) {
  const { prefs, setPrefs } = usePreferences();
  const { t, locale } = useI18n();
  const v = value ?? prefs.country;
  return (
    <Select id={id} className={className} value={v} onChange={(e) => (onChange ? onChange(e.currentTarget.value) : setPrefs({ country: e.currentTarget.value }))} aria-label={t('settings.country')}>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>{c.flag} {locale === 'tr' ? c.names.tr : c.names.en}</option>
      ))}
    </Select>
  );
}

/** Formats an amount with its ISO currency code. Different currencies are never summed. */
export function CurrencyDisplay({ amount, currency, className, showCode = true, strike }: { amount: number; currency: string; className?: string; showCode?: boolean; strike?: boolean }) {
  const { money } = useI18n();
  return (
    <span className={cn('tabular-nums', strike && 'line-through', className)}>
      {money(amount, currency)}
      {showCode && <span className="ml-1 text-[0.7em] font-medium text-muted">{currency}</span>}
    </span>
  );
}
