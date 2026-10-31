import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, getCountry, type LocaleCode } from '@/i18n/locales';

export type Theme = 'light' | 'dark' | 'system';
export interface Preferences {
  theme: Theme;
  locale: LocaleCode;
  country: string;
  currency: string;
  autoplay: 'always' | 'wifi' | 'never';
  reduceMotion: boolean;
  captions: boolean;
  /** user has made an explicit language/country choice (gates the first-run picker) */
  chosen: boolean;
}

const KEY = 'sf.prefs';

function detectLocale(): LocaleCode {
  const n = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'tr';
  if (n.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

function load(): Preferences {
  const defaults: Preferences = { theme: 'system', locale: detectLocale(), country: 'TR', currency: 'TRY', autoplay: 'always', reduceMotion: false, captions: true, chosen: false };
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Preferences>) };
  } catch {
    return defaults;
  }
}

interface Ctx {
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  resolvedTheme: 'light' | 'dark';
}

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Preferences>(load);
  const [systemDark, setSystemDark] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);

  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
  }, [resolvedTheme, prefs.reduceMotion]);

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.country && !patch.currency) next.currency = getCountry(patch.country).currency;
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, setPrefs, resolvedTheme }), [prefs, setPrefs, resolvedTheme]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences outside provider');
  return ctx;
}

/** True when autoplay of muted video is allowed by user preference, data-saver and reduced-motion. */
export function useAutoplayAllowed() {
  const { prefs } = usePreferences();
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefs.reduceMotion || reduced || prefs.autoplay === 'never') return false;
  if (prefs.autoplay === 'wifi') {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string } }).connection;
    if (conn?.saveData || conn?.type === 'cellular') return false;
  }
  return true;
}
