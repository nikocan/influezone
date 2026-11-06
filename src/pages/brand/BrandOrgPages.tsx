import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Inbox, ClipboardCheck, Package, Plus, Trash2, Building2, Percent, Store, Info } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useErrorToast, useProfilesMap } from '@/data/hooks';
import type { OrgRole } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui/misc';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { CountrySelector, CurrencyDisplay } from '@/components/common/Selectors';
import { EmptyState, ListSkeleton } from '@/components/common/States';
import { SmartImage } from '@/components/common/SmartImage';
import { SampleBadge } from '@/components/common/Labels';
import { CreatorAvatar } from '@/components/common/CreatorAvatar';
import { CreatorAnalyticsCard } from '@/components/monetization';
import { CATEGORIES } from '@/data/demo/seed';
import { getCountry } from '@/i18n/locales';
import { bqk, OrgSwitcher, PageHead, ReadOnlyNote, useBrand, VerificationBadge } from './brandCommon';
import { useMarketplaces } from '@/components/commerce/useCommerce';

const slugify = (s: string) => s.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Screen 11 — brand registration: organisation + brand profile, owner membership. */
export function BrandRegistrationPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { refreshProfile } = useAuth();
  const [f, setF] = useState({ name: '', slug: '', username: '', country: 'TR', website: '' });
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!touchedSlug) setF((x) => ({ ...x, slug: slugify(x.name), username: slugify(x.name).replace(/-/g, '').slice(0, 30) })); }, [f.name, touchedSlug]);
  const reg = useMutation({
    mutationFn: () => repo.registerBrand({ name: f.name, slug: f.slug, country: f.country, website: f.website || null, username: f.username }),
    onSuccess: async () => { await refreshProfile(); qc.invalidateQueries({ queryKey: ['brand'] }); nav('/brand', { replace: true }); },
    onError: (e) => setError(t(`errors.${(e as { code?: string }).code ?? 'unknown'}` as TKey)),
  });
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">{t('brand.registerTitle')}</h1>
      <p className="mt-1 text-sm text-muted">{t('brand.registerDesc')}</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); reg.mutate(); }}>
        {error && <p role="alert" className="rounded-sm bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <Field label={t('brand.name')}>{(p) => <Input {...p} required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label={t('brand.slug')} hint={t('brand.slugHint')}>{(p) => <Input {...p} required pattern="[a-z0-9-]{3,60}" value={f.slug} onChange={(e) => { setTouchedSlug(true); setF({ ...f, slug: e.target.value.toLowerCase() }); }} />}</Field>
        <Field label={t('brand.username')} hint={t('brand.usernameHint')}>{(p) => <Input {...p} required pattern="[a-z0-9_.]{3,30}" value={f.username} onChange={(e) => { setTouchedSlug(true); setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }); }} />}</Field>
        <Field label={t('settings.country')}>{(p) => <CountrySelector id={p.id} value={f.country} onChange={(c) => setF({ ...f, country: c })} />}</Field>
        <Field label={t('settings.website')} hint={t('settings.websiteHint')}>{(p) => <Input {...p} type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />}</Field>
        <div className="rounded-md bg-surface p-3 text-xs text-muted">{t('brand.verificationNote')}</div>
        <label className="flex min-h-[44px] items-start gap-3 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7047EB]" /><span>{t('brand.agree')} <Link to="/legal/terms" target="_blank" className="font-semibold text-primary">{t('legal.terms')}</Link></span></label>
        <Button type="submit" block size="lg" loading={reg.isPending} disabled={!agree || f.name.trim().length < 2}>{t('brand.register')}</Button>
      </form>
    </div>
  );
}

export function BrandDashboard() {
  const { t, num } = useI18n();
  const repo = useRepo();
  const { membership } = useBrand();
  const org = membership.organization;
  const campaigns = useQuery({ queryKey: bqk.campaigns(org.id), queryFn: () => repo.listCampaigns(org.id) });
  const apps = useQuery({ queryKey: bqk.apps(org.id), queryFn: () => repo.listOrgApplications(org.id) });
  const dels = useQuery({ queryKey: bqk.dels(org.id), queryFn: () => repo.listOrgDeliverables(org.id) });
  const products = useQuery({ queryKey: bqk.products(org.id), queryFn: () => repo.listOrgProducts(org.id) });
  const cs = campaigns.data ?? [];
  const active = cs.filter((c) => c.status === 'open' || c.status === 'in_progress').length;
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('brand.hello', { name: org.name })} desc={t('brand.dashDesc')} action={<Button asChild><Link to="/brand/campaigns/new"><Plus className="h-4 w-4" />{t('screens.campaignCreate')}</Link></Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/brand/campaigns"><CreatorAnalyticsCard icon={<Megaphone />} label={t('brand.activeCampaigns')} value={num(active)} hint={t('brand.ofTotal', { n: cs.length })} /></Link>
        <Link to="/brand/applications"><CreatorAnalyticsCard icon={<Inbox />} label={t('brand.pendingApplications')} value={num((apps.data ?? []).filter((a) => a.status === 'pending').length)} /></Link>
        <Link to="/brand/deliverables"><CreatorAnalyticsCard icon={<ClipboardCheck />} label={t('brand.deliverablesToReview')} value={num((dels.data ?? []).filter((d) => d.status === 'submitted').length)} /></Link>
        <Link to="/brand/catalog"><CreatorAnalyticsCard icon={<Package />} label={t('brand.products')} value={num(products.data?.length ?? 0)} /></Link>
      </div>
      {cs.filter((c) => c.status === 'pending_approval').length > 0 && <p className="mt-4 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><Info className="h-4 w-4 shrink-0 text-warning" />{t('brand.pendingApprovalNote')}</p>}
      {org.verificationStatus !== 'verified' && <p className="mt-4 rounded-md bg-surface p-3 text-xs text-muted">{t('brand.unverifiedNote')}</p>}
    </div>
  );
}

export function OrgSettingsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { membership, isAdmin } = useBrand();
  const org = membership.organization;
  const [f, setF] = useState({ name: org.name, website: org.website ?? '', country: org.country });
  useEffect(() => setF({ name: org.name, website: org.website ?? '', country: org.country }), [org]);
  const save = useMutation({ mutationFn: () => repo.updateOrganization(org.id, { name: f.name, website: f.website || null, country: f.country }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand'] }); toast({ variant: 'success', title: t('settings.saved') }); }, onError });
  return (
    <div className="max-w-xl">
      <OrgSwitcher />
      <PageHead title={t('screens.brandOrgSettings')} />
      <Card className="mb-4 flex items-center gap-3 p-4">
        <Building2 className="h-5 w-5 text-gold" />
        <div className="flex-1 text-sm"><p className="font-semibold">{t('brand.verificationTitle')}</p><p className="text-xs text-muted">{t('brand.verificationNote')}</p></div>
        <VerificationBadge status={org.verificationStatus} />
      </Card>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label={t('brand.name')}>{(p) => <Input {...p} disabled={!isAdmin} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label={t('settings.website')} hint={t('settings.websiteHint')}>{(p) => <Input {...p} disabled={!isAdmin} type="url" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />}</Field>
        <Field label={t('settings.country')}>{(p) => <CountrySelector id={p.id} value={f.country} onChange={(c) => isAdmin && setF({ ...f, country: c })} />}</Field>
        <p className="text-xs text-muted">{t('brand.slug')}: <span className="font-mono">{org.slug}</span></p>
        {isAdmin ? <Button type="submit" loading={save.isPending}>{t('common.save')}</Button> : <p className="text-xs text-muted">{t('brand.adminOnly')}</p>}
      </form>
    </div>
  );
}

const ASSIGNABLE: Exclude<OrgRole, 'owner'>[] = ['admin', 'manager', 'analyst', 'member'];

export function TeamPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { session } = useAuth();
  const { membership, isAdmin } = useBrand();
  const org = membership.organization;
  const members = useQuery({ queryKey: bqk.members(org.id), queryFn: () => repo.listOrgMembers(org.id) });
  const profiles = useProfilesMap((members.data ?? []).map((m) => m.profileId));
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Exclude<OrgRole, 'owner'>>('analyst');
  const add = useMutation({ mutationFn: () => repo.addOrgMember(org.id, username.replace(/^@/, ''), role), onSuccess: () => { setUsername(''); qc.invalidateQueries({ queryKey: bqk.members(org.id) }); toast({ variant: 'success', title: t('brand.memberAdded') }); }, onError });
  const remove = useMutation({ mutationFn: (uid: string) => repo.removeOrgMember(org.id, uid), onSuccess: () => qc.invalidateQueries({ queryKey: ['brand'] }), onError });
  return (
    <div className="max-w-2xl">
      <OrgSwitcher />
      <PageHead title={t('screens.teamPermissions')} desc={t('brand.teamDesc')} />
      <Card className="mb-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs text-muted"><tr><th className="p-3 text-start font-medium">{t('brand.role')}</th>{(['view', 'campaigns', 'review', 'settings'] as const).map((k) => <th key={k} className="p-3 text-center font-medium">{t(`brand.perm.${k}` as TKey)}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {(['owner', 'admin', 'manager', 'analyst', 'member'] as OrgRole[]).map((r, i) => (
              <tr key={r}><td className="p-3 font-medium">{t(`brand.roles.${r}` as TKey)}</td>{[i <= 3, i <= 2, i <= 2, i <= 1].map((ok, j) => <td key={j} className="p-3 text-center">{ok ? '✓' : '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Card>
      {isAdmin && (
        <form className="mb-5 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (username.trim()) add.mutate(); }}>
          <Field label={t('auth.username')} className="min-w-[180px] flex-1">{(p) => <Input {...p} placeholder="@" value={username} onChange={(e) => setUsername(e.target.value)} />}</Field>
          <Field label={t('brand.role')}>{(p) => <Select {...p} value={role} onChange={(e) => setRole(e.currentTarget.value as typeof role)}>{ASSIGNABLE.map((r) => <option key={r} value={r}>{t(`brand.roles.${r}` as TKey)}</option>)}</Select>}</Field>
          <Button type="submit" loading={add.isPending}><Plus className="h-4 w-4" />{t('brand.addMember')}</Button>
        </form>
      )}
      {members.isLoading ? <ListSkeleton /> : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {members.data?.map((m) => {
            const p = profiles.data?.get(m.profileId);
            return (
              <li key={m.userId} className="flex items-center gap-3 p-3">
                <CreatorAvatar profile={p} size="sm" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p?.displayName ?? '…'}</span><span className="text-xs text-muted">@{p?.username}</span></span>
                <Badge tone={m.role === 'owner' ? 'gold' : 'outline'}>{t(`brand.roles.${m.role}` as TKey)}</Badge>
                {m.role !== 'owner' && (isAdmin || m.userId === session?.userId) && (
                  <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(m.userId)} aria-label={t('common.remove')}><Trash2 className="h-4 w-4" /></Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CatalogPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const q = useQuery({ queryKey: bqk.products(org.id), queryFn: () => repo.listOrgProducts(org.id) });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.brandCatalog')} desc={t('brand.catalogDesc')} action={canManage && <Button asChild><Link to="/brand/catalog/new"><Plus className="h-4 w-4" />{t('brand.newProduct')}</Link></Button>} />
      <ReadOnlyNote />
      {q.isLoading ? <ListSkeleton /> : !q.data?.length ? <EmptyState icon={<Package />} title={t('brand.noProducts')} description={t('brand.noProductsDesc')} /> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => (
            <li key={p.id}><Card className="flex gap-3 p-3">
              <SmartImage src={p.images[0]} alt="" fallbackLabel={p.title} className="h-16 w-16 shrink-0 rounded-sm object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                {p.variant && <p className="truncate text-xs text-muted">{p.variant}</p>}
                <div className="mt-1 flex flex-wrap gap-1"><Badge tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>{t(`brand.productStatus.${p.status}` as TKey)}</Badge>{p.isSample && <SampleBadge />}</div>
                {p.status === 'approved' && <Link to={`/product/${p.id}`} className="mt-1 inline-block text-xs font-semibold text-primary">{t('brand.viewPublic')}</Link>}
              </div>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductEditPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const [f, setF] = useState({ title: '', variant: '', description: '', category: 'fashion', gtin: '', imageUrl: '', countries: [org.country] });
  const create = useMutation({
    mutationFn: () => repo.createOrgProduct(org.id, { title: f.title, variant: f.variant || null, description: f.description, category: f.category, gtin: f.gtin || null, countries: f.countries, imageUrl: f.imageUrl || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: bqk.products(org.id) }); toast({ variant: 'success', title: t('brand.productSubmitted') }); nav('/brand/catalog'); },
    onError,
  });
  if (!canManage) return <ReadOnlyNote />;
  return (
    <div className="max-w-xl">
      <PageHead title={t('brand.newProduct')} desc={t('brand.productReviewNote')} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Field label={t('create.pTitle')}>{(p) => <Input {...p} required minLength={2} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label={t('create.pVariant')} hint={t('brand.variantHint')}>{(p) => <Input {...p} value={f.variant} onChange={(e) => setF({ ...f, variant: e.target.value })} />}</Field>
        <Field label={t('brand.description')}>{(p) => <Textarea {...p} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        <Field label={t('create.category')}>{(p) => <Select {...p} value={f.category} onChange={(e) => setF({ ...f, category: e.currentTarget.value })}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(`categories.${c.slug}` as TKey)}</option>)}</Select>}</Field>
        <Field label="GTIN / EAN / UPC" hint={t('create.pGtinHint')}>{(p) => <Input {...p} inputMode="numeric" pattern="[0-9]{8,14}" value={f.gtin} onChange={(e) => setF({ ...f, gtin: e.target.value })} />}</Field>
        <Field label={t('brand.imageUrl')} hint={t('settings.websiteHint')}>{(p) => <Input {...p} type="url" placeholder="https://" value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} />}</Field>
        <Button type="submit" loading={create.isPending}>{t('brand.submitProduct')}</Button>
      </form>
    </div>
  );
}

export function BrandOffersPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const { membership } = useBrand();
  const org = membership.organization;
  const products = useQuery({ queryKey: bqk.products(org.id), queryFn: () => repo.listOrgProducts(org.id) });
  const markets = useMarketplaces();
  const offers = useQuery({
    queryKey: ['brand', org.id, 'offers', (products.data ?? []).map((p) => p.id).join(',')],
    queryFn: async () => (await Promise.all((products.data ?? []).filter((p) => p.status === 'approved').map((p) => repo.listOffers(p.id)))).flat(),
    enabled: !!products.data,
  });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.brandOffers')} desc={t('brand.offersDesc')} />
      {offers.isLoading || products.isLoading ? <ListSkeleton /> : !offers.data?.length ? <EmptyState icon={<Store />} title={t('brand.noOffers')} description={t('brand.noOffersDesc')} /> : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface text-xs text-muted"><tr><th className="p-3 text-start font-medium">{t('product.product')}</th><th className="p-3 text-start font-medium">{t('brand.store')}</th><th className="p-3 text-start font-medium">{t('settings.country')}</th><th className="p-3 text-end font-medium">{t('brand.price')}</th><th className="p-3 text-start font-medium">{t('brand.source')}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {offers.data.map((o) => (
                <tr key={o.id}>
                  <td className="p-3">{products.data?.find((p) => p.id === o.productId)?.title}</td>
                  <td className="p-3">{markets.data?.get(o.marketplaceId)?.name}</td>
                  <td className="p-3">{getCountry(o.country).flag} {o.country}</td>
                  <td className="p-3 text-end"><CurrencyDisplay amount={o.price} currency={o.currency} /></td>
                  <td className="p-3 text-xs text-muted">{t(`brand.sources.${o.priceSource}` as TKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BrandCommissionRulesPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl">
      <OrgSwitcher />
      <PageHead title={t('screens.brandCommissionRules')} desc={t('brand.rulesDesc')} />
      <Card className="space-y-3 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><Percent className="h-4 w-4 text-primary" />{t('brand.rulesDefault')}</p>
        <p className="text-muted">{t('brand.rulesCampaign')}</p>
        <p className="text-muted">{t('brand.rulesContract')}</p>
      </Card>
    </div>
  );
}
