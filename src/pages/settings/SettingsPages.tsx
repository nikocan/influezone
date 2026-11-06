import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, User, SlidersHorizontal, Lock, BellRing, Info, LogOut, Sparkles, Shield, FileText, Database, FlaskConical, RotateCcw } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { usePreferences, type Theme } from '@/providers/PreferencesProvider';
import { useBlockedSet, useErrorToast, useMutedSet, useProfilesMap } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { Field, Input, Textarea, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Segmented, Switch, Card, Badge } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { CountrySelector, LanguageSelector } from '@/components/common/Selectors';
import { CreatorAvatar } from '@/components/common/CreatorAvatar';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { EmptyState } from '@/components/common/States';
import { errorCode } from '@/data/errors';
import { dataMode, isSupabaseConfigured } from '@/lib/env';
import { resetDemo } from '@/data/demo/store';
import { PLANNED_LOCALES } from '@/i18n/locales';

function Row({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc?: string }) {
  return (
    <li>
      <Link to={to} className="flex min-h-[56px] items-center gap-3 px-4 py-2 hover:bg-surface">
        <span className="text-muted [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span>{desc && <span className="block truncate text-xs text-muted">{desc}</span>}</span>
        <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
      </Link>
    </li>
  );
}

export function SettingsHome() {
  const { t } = useI18n();
  const { session, auth, isModerator } = useAuth();
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-[620px] pb-8">
      <TopNavigation title={t('nav.settings')} />
      <ul className="divide-y divide-line">
        {session && <Row to="/settings/profile" icon={<User />} label={t('settings.editProfile')} />}
        <Row to="/settings/preferences" icon={<SlidersHorizontal />} label={t('settings.preferences')} desc={t('settings.preferencesDesc')} />
        {session && <Row to="/settings/privacy" icon={<Lock />} label={t('settings.privacy')} desc={t('settings.privacyDesc')} />}
        {session && <Row to="/settings/price-alerts" icon={<BellRing />} label={t('alerts.title')} />}
        <Row to="/updates" icon={<Sparkles />} label={t('nav.updates')} desc={t('updates.subtitle')} />
        <Row to="/legal/terms" icon={<FileText />} label={t('legal.terms')} />
        <Row to="/legal/privacy" icon={<Shield />} label={t('legal.privacy')} />
        <Row to="/settings/about" icon={<Info />} label={t('settings.about')} desc={dataMode === 'demo' ? t('demo.bannerTitle') : 'Supabase'} />
        {isModerator && <Row to="/admin" icon={<Shield />} label={t('nav.admin')} />}
      </ul>
      <div className="px-4 pt-6">
        {session ? (
          <Button variant="secondary" block onClick={async () => { await auth.signOut(); nav('/', { replace: true }); }}><LogOut className="h-4 w-4" />{t('auth.signOut')}</Button>
        ) : (
          <Button asChild block><Link to="/auth/sign-in">{t('auth.signIn')}</Link></Button>
        )}
      </div>
    </div>
  );
}

export function EditProfilePage() {
  const { t } = useI18n();
  const { profile, repo, refreshProfile } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ displayName: '', username: '', bio: '', website: '', avatarUrl: '' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (profile) setF({ displayName: profile.displayName, username: profile.username, bio: profile.bio, website: profile.website ?? '', avatarUrl: profile.avatarUrl ?? '' }); }, [profile]);
  const save = useMutation({
    mutationFn: () => {
      if (f.website && !/^https:\/\//.test(f.website)) throw new Error('invalid_url');
      return repo.updateMyProfile({ displayName: f.displayName.trim(), username: f.username, bio: f.bio, website: f.website || null, avatarUrl: f.avatarUrl || null });
    },
    onSuccess: async () => { await refreshProfile(); qc.invalidateQueries({ queryKey: ['profile'] }); setError(null); toast({ variant: 'success', title: t('settings.saved') }); },
    onError: (e) => setError(e instanceof Error && e.message === 'invalid_url' ? t('errors.invalid_url') : t(`errors.${errorCode(e)}` as TKey)),
  });
  const onAvatar = async (file?: File) => {
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    c.getContext('2d')!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
    setF((x) => ({ ...x, avatarUrl: c.toDataURL('image/jpeg', 0.8) }));
  };
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-[620px] pb-8">
      <TopNavigation title={t('settings.editProfile')} />
      <form className="space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex items-center gap-4">
          <CreatorAvatar profile={{ ...profile, avatarUrl: f.avatarUrl || null }} size="lg" />
          <label className="cursor-pointer text-sm font-semibold text-primary">
            {t('settings.changePhoto')}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </label>
          {f.avatarUrl && <button type="button" className="text-sm text-muted" onClick={() => setF({ ...f, avatarUrl: '' })}>{t('common.remove')}</button>}
        </div>
        {error && <p role="alert" className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <Field label={t('auth.displayName')}>{(p) => <Input {...p} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={60} required />}</Field>
        <Field label={t('auth.username')} hint={t('auth.usernameHint')}>{(p) => <Input {...p} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} maxLength={30} required />}</Field>
        <Field label={t('settings.bio')} hint={`${f.bio.length}/300`}>{(p) => <Textarea {...p} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={300} />}</Field>
        <Field label={t('settings.website')} hint={t('settings.websiteHint')}>{(p) => <Input {...p} type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />}</Field>
        <Button type="submit" block loading={save.isPending}>{t('common.save')}</Button>
      </form>
    </div>
  );
}

export function PreferencesPage() {
  const { t } = useI18n();
  const { prefs, setPrefs } = usePreferences();
  const { session, repo, refreshProfile } = useAuth();
  // keep profile country/locale in sync for signed-in users
  useEffect(() => {
    if (!session) return;
    const id = setTimeout(() => { repo.updateMyProfile({ country: prefs.country, locale: prefs.locale }).then(refreshProfile).catch(() => {}); }, 500);
    return () => clearTimeout(id);
  }, [prefs.country, prefs.locale, session, repo, refreshProfile]);
  return (
    <div className="mx-auto max-w-[620px] pb-8">
      <TopNavigation title={t('settings.preferences')} />
      <div className="space-y-6 p-4">
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('settings.region')}</h2>
          <Field label={t('settings.language')} hint={t('settings.languageHint', { list: PLANNED_LOCALES.join(', ').toUpperCase() })}>{(p) => <LanguageSelector id={p.id} />}</Field>
          <Field label={t('settings.country')} hint={t('settings.countryHint')}>{(p) => <CountrySelector id={p.id} />}</Field>
          <Field label={t('settings.currency')} hint={t('settings.currencyHint')}>{(p) => (
            <Select {...p} value={prefs.currency} onChange={(e) => setPrefs({ currency: e.currentTarget.value })}>
              {['TRY', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'JPY', 'BRL', 'MXN'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}</Field>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('settings.appearance')}</h2>
          <Segmented<Theme> label={t('settings.theme')} value={prefs.theme} onChange={(v) => setPrefs({ theme: v })} options={[{ value: 'light', label: t('settings.light') }, { value: 'dark', label: t('settings.dark') }, { value: 'system', label: t('settings.system') }]} />
          <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => setPrefs({ reduceMotion: v })} label={t('settings.reduceMotion')} description={t('settings.reduceMotionDesc')} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('settings.video')}</h2>
          <Field label={t('settings.autoplay')}>{(p) => (
            <Select {...p} value={prefs.autoplay} onChange={(e) => setPrefs({ autoplay: e.currentTarget.value as 'always' })}>
              <option value="always">{t('settings.autoplayAlways')}</option>
              <option value="wifi">{t('settings.autoplayWifi')}</option>
              <option value="never">{t('settings.autoplayNever')}</option>
            </Select>
          )}</Field>
          <Switch checked={prefs.captions} onCheckedChange={(v) => setPrefs({ captions: v })} label={t('settings.captions')} />
        </section>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { t } = useI18n();
  const { profile, repo, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { data: blocked } = useBlockedSet();
  const { data: muted } = useMutedSet();
  const people = useProfilesMap([...(blocked ?? []), ...(muted ?? [])]);
  const priv = useMutation({ mutationFn: (v: boolean) => repo.updateMyProfile({ isPrivate: v }), onSuccess: () => refreshProfile(), onError });
  const unblock = useMutation({ mutationFn: (id: string) => repo.unblock(id), onSuccess: () => qc.invalidateQueries(), onError });
  const unmute = useMutation({ mutationFn: (id: string) => repo.unmute(id), onSuccess: () => qc.invalidateQueries(), onError });
  return (
    <div className="mx-auto max-w-[620px] pb-8">
      <TopNavigation title={t('settings.privacy')} />
      <div className="space-y-6 p-4">
        <Switch checked={!!profile?.isPrivate} onCheckedChange={(v) => priv.mutate(v)} label={t('settings.privateAccount')} description={t('settings.privateAccountDesc')} />
        <p className="text-xs text-muted">{t('settings.dmPolicyNote')}</p>
        {(['blocked', 'muted'] as const).map((k) => {
          const ids = [...((k === 'blocked' ? blocked : muted) ?? [])];
          return (
            <section key={k}>
              <h2 className="mb-2 text-sm font-bold">{t(`settings.${k}` as TKey)}</h2>
              {!ids.length ? <p className="text-sm text-muted">{t('settings.noneYet')}</p> : (
                <ul className="space-y-2">{ids.map((id) => { const p = people.data?.get(id); return (
                  <li key={id} className="flex items-center gap-3"><CreatorAvatar profile={p} size="sm" /><span className="flex-1 text-sm font-semibold">{p?.username}</span>
                    <Button size="sm" variant="secondary" onClick={() => (k === 'blocked' ? unblock.mutate(id) : unmute.mutate(id))}>{k === 'blocked' ? t('profile.unblock') : t('profile.unmute')}</Button></li>
                ); })}</ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function AboutPage() {
  const { t } = useI18n();
  const { auth, session, refreshProfile } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const repo = useRepo();
  const [confirm, setConfirm] = useState(false);
  const counts = useQuery({ queryKey: ['about', 'clicks'], queryFn: async () => (await repo.listMarketplaces()).length });
  return (
    <div className="mx-auto max-w-[620px] pb-8">
      <TopNavigation title={t('settings.about')} />
      <div className="space-y-4 p-4">
        <Card className="p-4">
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h2 className="font-semibold">{t('about.dataMode')}</h2><Badge tone={dataMode === 'demo' ? 'warning' : 'success'}>{dataMode === 'demo' ? t('demo.short') : 'Supabase'}</Badge></div>
          <p className="mt-2 text-sm text-muted">{dataMode === 'demo' ? t('about.demoBody') : t('about.liveBody')}</p>
          {!isSupabaseConfigured && <p className="mt-2 text-xs text-muted">{t('about.howToConnect')}</p>}
        </Card>
        {dataMode === 'demo' && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-warning" /><h2 className="font-semibold">{t('about.demoTools')}</h2></div>
            <p className="text-sm text-muted">{t('about.sampleList', { n: counts.data ?? 0 })}</p>
            {session && auth.grantDemoRole && (
              <Button variant="secondary" block onClick={async () => { await auth.grantDemoRole!('admin'); await refreshProfile(); toast({ variant: 'success', title: t('about.adminGranted') }); }}>
                <Shield className="h-4 w-4" />{t('about.grantAdmin')}
              </Button>
            )}
            <Button variant="danger" block onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" />{t('about.reset')}</Button>
          </Card>
        )}
        <Card className="p-4 text-sm">
          <p className="font-semibold">Shopfluence 0.4.0</p>
          <p className="text-muted">Where Influence Becomes Income</p>
          <Link to="/updates" className="mt-2 inline-block font-semibold text-primary">{t('nav.updates')}</Link>
        </Card>
      </div>
      <ConfirmationDialog open={confirm} onOpenChange={setConfirm} title={t('about.reset')} description={t('about.resetDesc')} confirmLabel={t('about.resetConfirm')} danger onConfirm={async () => {
        resetDemo(); localStorage.removeItem('sf.demo.session'); await auth.signOut(); qc.clear(); setConfirm(false); nav('/', { replace: true }); location.reload();
      }} />
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  return <EmptyState className="min-h-[60dvh]" title={t('common.notFound')} description={t('common.notFoundDesc')} action={<Button asChild><Link to="/">{t('nav.home')}</Link></Button>} />;
}
