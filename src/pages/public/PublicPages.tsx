import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Sparkles, Megaphone, ShieldCheck, Globe2, BadgeCheck, ArrowRight } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { Logo, LogoMark } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { CountrySelector, LanguageSelector } from '@/components/common/Selectors';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { getCountry } from '@/i18n/locales';
import { useAuth } from '@/providers/AuthProvider';

export function BootScreen() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg" role="status" aria-label="Shopfluence">
      <LogoMark className="h-16 w-16 animate-pulse motion-reduce:animate-none" />
      <span className="text-sm font-semibold tracking-tight text-muted">Where Influence Becomes Income</span>
    </div>
  );
}

export function LandingPage() {
  const { t } = useI18n();
  const { prefs, setPrefs } = usePreferences();
  const { session } = useAuth();
  const choose = () => setPrefs({ chosen: true });
  const country = getCountry(prefs.country);
  const pillars = [
    { icon: ShoppingBag, k: 'shoppers' },
    { icon: Sparkles, k: 'creators' },
    { icon: Megaphone, k: 'brands' },
  ] as const;
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo className="h-8" />
        <div className="flex items-center gap-2">
          <Link to="/welcome/locale" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium" aria-label={t('locale.change')}>
            <Globe2 className="h-4 w-4" />{country.flag} {prefs.locale.toUpperCase()}
          </Link>
          {!session && <Button asChild variant="ghost" size="sm" onClick={choose}><Link to="/auth/sign-in">{t('auth.signIn')}</Link></Button>}
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 md:pt-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">{t('landing.badge')}</p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{t('landing.title')}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t('landing.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" onClick={choose}><Link to={session ? '/' : '/auth/register'}>{session ? t('landing.openApp') : t('landing.ctaJoin')}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link></Button>
              <Button asChild size="lg" variant="secondary" onClick={choose}><Link to="/">{t('landing.ctaBrowse')}</Link></Button>
            </div>
          </div>
        </section>
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
            {pillars.map(({ icon: I, k }) => (
              <div key={k} className="rounded-lg border border-line bg-bg p-6">
                <I className="h-7 w-7 text-primary" aria-hidden />
                <h2 className="mt-4 text-lg font-bold">{t(`landing.${k}.title` as TKey)}</h2>
                <p className="mt-2 text-sm text-muted">{t(`landing.${k}.body` as TKey)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold">{t('landing.trustTitle')}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {(['t1', 't2', 't3'] as const).map((k) => (
              <li key={k} className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-success" aria-hidden /><p className="text-sm"><strong className="block">{t(`landing.trust.${k}.title` as TKey)}</strong><span className="text-muted">{t(`landing.trust.${k}.body` as TKey)}</span></p></li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <span>© 2026 Shopfluence</span>
          <Link to="/legal/terms" className="hover:text-fg">{t('legal.terms')}</Link>
          <Link to="/legal/privacy" className="hover:text-fg">{t('legal.privacy')}</Link>
          <Link to="/legal/creator" className="hover:text-fg">{t('legal.creator')}</Link>
          <Link to="/updates" className="hover:text-fg">{t('nav.updates')}</Link>
        </div>
      </footer>
    </div>
  );
}

export function LocaleSelectPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { prefs, setPrefs } = usePreferences();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Logo className="mb-8 h-9" />
      <h1 className="text-2xl font-bold">{t('locale.title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('locale.desc')}</p>
      <div className="mt-8 space-y-5">
        <Field label={t('settings.language')}>{(p) => <LanguageSelector id={p.id} />}</Field>
        <Field label={t('settings.country')} hint={t('locale.countryHint')}>{(p) => <CountrySelector id={p.id} />}</Field>
        <p className="text-sm text-muted">{t('locale.currency')}: <strong className="text-fg">{prefs.currency}</strong></p>
      </div>
      <Button size="lg" className="mt-8" onClick={() => { setPrefs({ chosen: true }); nav(-1); }}>{t('common.continue')}</Button>
    </div>
  );
}

export function LegalPage() {
  const { doc = 'terms' } = useParams();
  const { t } = useI18n();
  const valid = ['terms', 'privacy', 'creator', 'cookies'].includes(doc);
  const d = valid ? doc : 'terms';
  return (
    <div className="mx-auto max-w-2xl pb-12">
      <TopNavigation title={t(`legal.${d}` as TKey)} />
      <article className="space-y-4 px-4 pt-4 text-sm leading-relaxed">
        <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs"><BadgeCheck className="me-1 inline h-4 w-4 text-warning" />{t('legal.draftNotice')}</p>
        <h1 className="text-2xl font-bold">{t(`legal.${d}` as TKey)}</h1>
        <p className="text-xs text-muted">{t('legal.version')}: 2026-10-01</p>
        {(['s1', 's2', 's3', 's4'] as const).map((s) => (
          <section key={s}><h2 className="mb-1 font-semibold">{t(`legal.docs.${d}.${s}.h` as TKey)}</h2><p className="text-muted">{t(`legal.docs.${d}.${s}.p` as TKey)}</p></section>
        ))}
      </article>
    </div>
  );
}
