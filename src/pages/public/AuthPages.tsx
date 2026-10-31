import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MailCheck, FlaskConical, Check, ShoppingBag, Sparkles, Building2 } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { errorCode } from '@/data/errors';
import { EMAIL_RE, passwordStrength, TERMS_VERSION } from '@/data/auth/types';
import { CountrySelector } from '@/components/common/Selectors';
import { CATEGORIES } from '@/data/demo/seed';
import { CATEGORY_ICONS } from '@/pages/social/ExplorePage';
import { cn } from '@/lib/utils';
import { dataMode } from '@/lib/env';

function AuthLayout({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-16 items-center justify-between px-4"><Link to="/welcome" aria-label="Shopfluence"><Logo className="h-8" /></Link></header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 md:items-center">
        <div className="w-full max-w-md rounded-lg border border-line bg-bg p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
      {footer && <footer className="pb-8 text-center text-sm text-muted">{footer}</footer>}
    </div>
  );
}

function DemoCodeNote({ code }: { code?: string }) {
  const { t } = useI18n();
  if (!code) return null;
  return (
    <div role="note" className="mb-4 flex gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
      <FlaskConical className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      <p>{t('auth.demoCode')} <strong className="font-mono text-base tracking-widest">{code}</strong></p>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pe-11" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-0 top-0 flex h-11 w-11 items-center justify-center text-muted" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={show}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SocialButtons() {
  const { t } = useI18n();
  const { auth } = useAuth();
  const toast = useToast();
  const go = async (p: 'google' | 'apple') => {
    try { await auth.signInWithProvider(p); } catch (e) { toast({ variant: 'error', title: t(`errors.${errorCode(e)}` as TKey) }); }
  };
  const disabled = auth.mode === 'demo';
  return (
    <div id="social" className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={() => go('google')} disabled={disabled}>Google</Button>
        <Button type="button" variant="secondary" onClick={() => go('apple')} disabled={disabled}>Apple</Button>
      </div>
      {disabled && <p className="text-center text-xs text-muted">{t('auth.socialNotConfigured')}</p>}
      <div className="flex items-center gap-3 py-2 text-xs text-muted"><span className="h-px flex-1 bg-line" />{t('auth.or')}<span className="h-px flex-1 bg-line" /></div>
    </div>
  );
}

export function SignInPage() {
  const { t } = useI18n();
  const { auth } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = (loc.state as { from?: string } | null)?.from ?? '/';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await auth.signIn(email, password);
      nav(next, { replace: true });
    } catch (err) {
      const code = errorCode(err);
      if (code === 'email_not_verified') return nav(`/auth/verify?email=${encodeURIComponent(email)}`);
      setError(t(`errors.${code}` as TKey));
    } finally { setBusy(false); }
  };
  return (
    <AuthLayout title={t('auth.welcomeBack')} subtitle={t('auth.signInSubtitle')} footer={<>{t('auth.noAccount')} <Link to="/auth/register" className="font-semibold text-primary">{t('auth.createAccount')}</Link></>}>
      <SocialButtons />
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && <p role="alert" className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
        <Field label={t('auth.password')}>{(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
        <div className="flex justify-end"><Link to="/auth/reset" className="text-sm font-semibold text-primary">{t('auth.forgot')}</Link></div>
        <Button type="submit" block size="lg" loading={busy} disabled={!email || !password}>{t('auth.signIn')}</Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { t } = useI18n();
  const { auth, repo } = useAuth();
  const { prefs, setPrefs } = usePreferences();
  const nav = useNavigate();
  const [f, setF] = useState({ displayName: '', username: '', email: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [age, setAge] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usernameFree, setUsernameFree] = useState<boolean | null>(null);
  const strength = passwordStrength(f.password);
  const usernameValid = /^[a-z0-9_.]{3,30}$/.test(f.username);

  useEffect(() => {
    if (!usernameValid) { setUsernameFree(null); return; }
    const id = setTimeout(() => { repo.isUsernameAvailable(f.username).then(setUsernameFree).catch(() => setUsernameFree(null)); }, 350);
    return () => clearTimeout(id);
  }, [f.username, usernameValid, repo]);

  const errors = {
    displayName: !f.displayName.trim() ? t('validation.required') : null,
    username: !usernameValid ? t('validation.username') : usernameFree === false ? t('errors.username_taken') : null,
    email: !EMAIL_RE.test(f.email) ? t('validation.email') : null,
    password: strength < 2 ? t('validation.password') : null,
    terms: !terms || !age ? t('validation.terms') : null,
  };
  const valid = Object.values(errors).every((e) => !e);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await auth.signUp({ ...f, locale: prefs.locale, country: prefs.country, acceptedTermsVersion: TERMS_VERSION, marketingOptIn: marketing });
      setPrefs({ chosen: true });
      const q = new URLSearchParams({ email: f.email });
      if (res.demoCode) q.set('demo', res.demoCode);
      nav(`/auth/verify?${q}`);
    } catch (err) {
      setError(t(`errors.${errorCode(err)}` as TKey));
    } finally { setBusy(false); }
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] ?? undefined : undefined);
  return (
    <AuthLayout title={t('auth.createAccount')} subtitle={t('auth.registerSubtitle')} footer={<>{t('auth.haveAccount')} <Link to="/auth/sign-in" className="font-semibold text-primary">{t('auth.signIn')}</Link></>}>
      <SocialButtons />
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && <p role="alert" className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <Field label={t('auth.displayName')} error={err('displayName')}>{(p) => <Input {...p} autoComplete="name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={60} />}</Field>
        <Field label={t('auth.username')} hint={usernameFree === true ? t('auth.usernameFree') : t('auth.usernameHint')} error={err('username') ?? (usernameFree === false ? t('errors.username_taken') : undefined)}>
          {(p) => <Input {...p} autoComplete="username" autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} maxLength={30} />}
        </Field>
        <Field label={t('auth.email')} error={err('email')}>{(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label={t('auth.password')} error={err('password')} hint={t('auth.passwordHint')}>{(p) => <PasswordInput {...p} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
        <div className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full', i < strength ? (strength === 3 ? 'bg-success' : 'bg-warning') : 'bg-line')} />)}</div>
        <Field label={t('settings.country')}>{(p) => <CountrySelector id={p.id} />}</Field>
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">{t('auth.consents')}</legend>
          <label className="flex min-h-[44px] items-start gap-3"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7047EB]" /><span>{t('auth.ageConfirm')}</span></label>
          <label className="flex min-h-[44px] items-start gap-3"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7047EB]" />
            <span>{t('auth.acceptPrefix')} <Link to="/legal/terms" className="font-semibold text-primary" target="_blank">{t('legal.terms')}</Link> {t('auth.and')} <Link to="/legal/privacy" className="font-semibold text-primary" target="_blank">{t('legal.privacy')}</Link>{t('auth.acceptSuffix')}</span></label>
          <label className="flex min-h-[44px] items-start gap-3"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7047EB]" /><span className="text-muted">{t('auth.marketingOptIn')}</span></label>
          {touched && errors.terms && <p role="alert" className="text-xs text-danger">{errors.terms}</p>}
        </fieldset>
        <Button type="submit" block size="lg" loading={busy}>{t('auth.createAccount')}</Button>
        {dataMode === 'demo' && <p className="text-center text-xs text-muted">{t('auth.demoAccountNote')}</p>}
      </form>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const { t } = useI18n();
  const { auth } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [demoCode, setDemoCode] = useState(params.get('demo') ?? undefined);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await auth.verifyEmail(email, code); nav('/onboarding', { replace: true }); }
    catch { setError(t('auth.invalidCode')); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    try { const r = await auth.resendVerification(email); setDemoCode(r.demoCode); toast({ variant: 'success', title: t('auth.codeResent') }); }
    catch (e) { toast({ variant: 'error', title: t(`errors.${errorCode(e)}` as TKey) }); }
  };
  return (
    <AuthLayout title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email })}>
      <div className="mb-4 flex justify-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary"><MailCheck className="h-8 w-8" /></span></div>
      <DemoCodeNote code={demoCode} />
      <form className="space-y-4" onSubmit={verify}>
        {error && <p role="alert" className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <Field label={t('auth.code')}>{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center font-mono text-lg tracking-[0.5em]" />}</Field>
        <Button type="submit" block size="lg" loading={busy} disabled={code.length !== 6}>{t('auth.verify')}</Button>
        <Button type="button" variant="ghost" block onClick={resend} disabled={!email}>{t('auth.resend')}</Button>
        {auth.mode === 'supabase' && <p className="text-center text-xs text-muted">{t('auth.verifyLinkHint')}</p>}
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const { auth } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const recovery = typeof location !== 'undefined' && location.hash.includes('type=recovery');
  const [stage, setStage] = useState<'request' | 'set'>(recovery ? 'set' : 'request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await auth.requestPasswordReset(email); setDemoCode(r.demoCode); setStage(auth.mode === 'demo' ? 'set' : 'request'); toast({ variant: 'success', title: t('auth.resetSent') }); }
    catch (err) { setError(t(`errors.${errorCode(err)}` as TKey)); }
    finally { setBusy(false); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await auth.resetPassword(email || null, code || null, pw); toast({ variant: 'success', title: t('auth.passwordUpdated') }); nav('/auth/sign-in', { replace: true }); }
    catch (err) { const c = errorCode(err); setError(c === 'validation' ? t('auth.invalidCode') : t(`errors.${c}` as TKey)); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title={t('auth.resetTitle')} subtitle={stage === 'request' ? t('auth.resetSubtitle') : t('auth.resetSetSubtitle')} footer={<Link to="/auth/sign-in" className="font-semibold text-primary">{t('auth.backToSignIn')}</Link>}>
      {error && <p role="alert" className="mb-4 rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {stage === 'request' ? (
        <form className="space-y-4" onSubmit={request}>
          <Field label={t('auth.email')}>{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
          <Button type="submit" block size="lg" loading={busy} disabled={!EMAIL_RE.test(email)}>{t('auth.sendReset')}</Button>
          <p className="text-center text-xs text-muted">{t('auth.resetPrivacy')}</p>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={save}>
          <DemoCodeNote code={demoCode} />
          {auth.mode === 'demo' && <Field label={t('auth.code')}>{(p) => <Input {...p} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center font-mono tracking-[0.4em]" />}</Field>}
          <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}>{(p) => <PasswordInput {...p} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
          <Button type="submit" block size="lg" loading={busy} disabled={passwordStrength(pw) < 2}>{t('auth.savePassword')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------
export function OnboardingPage() {
  const { t } = useI18n();
  const { repo, refreshProfile, profile } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState<'shopper' | 'creator' | 'brand'>(profile?.isCreator ? 'creator' : 'shopper');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [busy, setBusy] = useState(false);
  const toggle = (s: string) => setInterests((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  const finish = async () => {
    setBusy(true);
    try {
      await repo.updateMyProfile({ interests, isCreator: role === 'creator', onboardingCompleted: role !== 'creator' });
      await refreshProfile();
      if (role === 'creator') nav('/onboarding/creator', { replace: true });
      else if (role === 'brand') nav('/onboarding/brand', { replace: true });
      else nav('/', { replace: true });
    } catch (e) { toast({ variant: 'error', title: t(`errors.${errorCode(e)}` as TKey) }); }
    finally { setBusy(false); }
  };
  const roles = [
    { v: 'shopper', icon: ShoppingBag },
    { v: 'creator', icon: Sparkles },
    { v: 'brand', icon: Building2 },
  ] as const;
  return (
    <AuthLayout title={t('onboarding.title')} subtitle={t('onboarding.subtitle')}>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('onboarding.role')}</legend>
        <div className="space-y-2" role="radiogroup">
          {roles.map(({ v, icon: I }) => (
            <button key={v} type="button" role="radio" aria-checked={role === v} onClick={() => setRole(v)} className={cn('flex w-full items-center gap-3 rounded-md border p-3 text-start', role === v ? 'border-primary bg-primary-soft/50' : 'border-line hover:bg-surface')}>
              <I className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <span className="flex-1"><span className="block text-sm font-semibold">{t(`onboarding.roles.${v}.title` as TKey)}</span><span className="block text-xs text-muted">{t(`onboarding.roles.${v}.desc` as TKey)}</span></span>
              {role === v && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">{t('onboarding.interests')}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const I = CATEGORY_ICONS[c.icon]!;
            const on = interests.includes(c.slug);
            return (
              <button key={c.slug} type="button" aria-pressed={on} onClick={() => toggle(c.slug)} className={cn('inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm', on ? 'border-primary bg-primary text-white' : 'border-line hover:bg-surface')}>
                <I className="h-4 w-4" aria-hidden />{t(`categories.${c.slug}` as TKey)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button block size="lg" className="mt-8" onClick={finish} loading={busy} disabled={interests.length === 0}>{t('common.continue')}</Button>
      <p className="mt-2 text-center text-xs text-muted">{t('onboarding.changeLater')}</p>
    </AuthLayout>
  );
}

export function CreatorOnboardingPage() {
  const { t } = useI18n();
  const { repo, refreshProfile, profile } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [handles, setHandles] = useState({ instagram: '', tiktok: '', youtube: '' });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    setBusy(true);
    try {
      await repo.updateMyProfile({ bio, isCreator: true, onboardingCompleted: true });
      localStorage.setItem(`sf.creator.handles.${profile?.id}`, JSON.stringify(handles)); // unverified; server-side creator_profiles in Supabase mode is Phase 4
      await refreshProfile();
      toast({ variant: 'success', title: t('onboarding.creatorDone') });
      nav('/studio', { replace: true });
    } catch (e) { toast({ variant: 'error', title: t(`errors.${errorCode(e)}` as TKey) }); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title={t('onboarding.creatorTitle')} subtitle={t('onboarding.creatorSubtitle')}>
      <div className="space-y-4">
        <Field label={t('settings.bio')} hint={`${bio.length}/300`}>{(p) => <Input {...p} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />}</Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t('onboarding.platforms')}</legend>
          <p className="text-xs text-muted">{t('onboarding.platformsHint')}</p>
          {(['instagram', 'tiktok', 'youtube'] as const).map((k) => (
            <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}>{(p) => <Input {...p} placeholder="@" value={handles[k]} onChange={(e) => setHandles({ ...handles, [k]: e.target.value })} />}</Field>
          ))}
        </fieldset>
        <div className="rounded-md bg-surface p-3 text-xs text-muted">
          <p className="mb-1 font-semibold text-fg">{t('onboarding.disclosureTitle')}</p>
          <p>{t('onboarding.disclosureBody')}</p>
        </div>
        <label className="flex min-h-[44px] items-start gap-3 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7047EB]" /><span>{t('onboarding.creatorAgree')} <Link to="/legal/creator" target="_blank" className="font-semibold text-primary">{t('legal.creator')}</Link></span></label>
        <Button block size="lg" onClick={finish} loading={busy} disabled={!agree}>{t('onboarding.finish')}</Button>
      </div>
    </AuthLayout>
  );
}
