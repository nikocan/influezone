import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { tr, type Dict } from './tr';
import { en } from './en';
import { ar } from './ar';
import { getLocaleMeta, type LocaleCode, type LocaleMeta } from './locales';
import { formatCompact, formatCurrency, formatDate, formatNumber, formatRelative } from '@/lib/format';

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string ? never : { [K in keyof T]: T[K] extends string ? K & string : Join<K, Paths<T[K]>> }[keyof T];
export type TKey = Paths<Dict>;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

const DICTS: Record<LocaleCode, DeepPartial<Dict>> = { tr, en, ar };

function lookup(dict: DeepPartial<Dict> | undefined, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

export function translate(locale: LocaleCode, key: TKey, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export interface I18nValue {
  locale: LocaleCode;
  meta: LocaleMeta;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  money: (amount: number, currency: string) => string;
  num: (n: number) => string;
  compact: (n: number) => string;
  date: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  relative: (iso: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: LocaleCode; children: ReactNode }) {
  const meta = getLocaleMeta(locale);
  useEffect(() => {
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }, [meta]);
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      meta,
      t,
      money: (a, c) => formatCurrency(a, c, meta.intl),
      num: (n) => formatNumber(n, meta.intl),
      compact: (n) => formatCompact(n, meta.intl),
      date: (iso, opts) => formatDate(iso, meta.intl, opts),
      relative: (iso) => formatRelative(iso, meta.intl),
    }),
    [locale, meta, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
