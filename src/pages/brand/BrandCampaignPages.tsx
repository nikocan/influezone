import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Send, Check, X, Users, Eye, Heart, MousePointerClick, BadgeCheck, Wallet, ClipboardCheck, Inbox, Mail, Trash2, BarChart3, Scale } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useErrorToast, useProfilesMap, useConversations } from '@/data/hooks';
import type { Campaign, CampaignDeliverableSpec, CampaignInput, CampaignStatus, CampaignType, CreatorCard, Disclosure } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Card, Chip, Badge, SectionTitle, Switch } from '@/components/ui/misc';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { SampleBadge } from '@/components/common/Labels';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { CreatorAnalyticsCard } from '@/components/monetization';
import { ConversationList } from '@/pages/social/MessagesPages';
import { CATEGORIES } from '@/data/demo/seed';
import { COUNTRIES, getCountry } from '@/i18n/locales';
import { bqk, CampaignStatusBadge, CampaignTerms, OrgSwitcher, PageHead, ReadOnlyNote, useBrand } from './brandCommon';

const isoDate = (v: string | null) => (v ? v.slice(0, 10) : '');
const fromDate = (v: string) => (v ? new Date(`${v}T09:00:00`).toISOString() : null);

// ---------------------------------------------------------------------------
export function CampaignListPage() {
  const { t, date } = useI18n();
  const repo = useRepo();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');
  const q = useQuery({ queryKey: bqk.campaigns(org.id), queryFn: () => repo.listCampaigns(org.id) });
  const list = (q.data ?? []).filter((c) => filter === 'all' || c.status === filter);
  const statuses: (CampaignStatus | 'all')[] = ['all', 'draft', 'pending_approval', 'open', 'in_progress', 'paused', 'completed', 'cancelled'];
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.campaignList')} action={canManage && <Button asChild><Link to="/brand/campaigns/new"><Plus className="h-4 w-4" />{t('screens.campaignCreate')}</Link></Button>} />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">{statuses.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s === 'all' ? t('categories.all') : t(`campaigns.status.${s}` as TKey)}</Chip>)}</div>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !list.length ? (
        <EmptyState icon={<Megaphone />} title={t('campaigns.empty')} description={t('campaigns.emptyDesc')} action={canManage ? <Button asChild><Link to="/brand/campaigns/new">{t('screens.campaignCreate')}</Link></Button> : undefined} />
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}><Link to={`/brand/campaigns/${c.id}`}><Card className="p-4 hover:bg-surface">
              <div className="flex flex-wrap items-center gap-2"><p className="flex-1 font-semibold">{c.title}</p><CampaignStatusBadge status={c.status} /></div>
              <div className="mt-1"><CampaignTerms c={c} /></div>
              <p className="mt-1 text-xs text-muted">{c.startsAt ? `${date(c.startsAt)} → ${c.endsAt ? date(c.endsAt) : '…'}` : t('campaigns.noDates')}</p>
            </Card></Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
const EMPTY: CampaignInput = {
  title: '', objective: 'awareness', brief: '', type: 'fixed_fee', currency: 'TRY', budget: null, fixedFee: null, commissionBps: null, countries: ['TR'], categories: [],
  minFollowers: 1000, deliverables: [{ kind: 'post', count: 1 }], requiredDisclosure: 'sponsored', productIds: [], applicationDeadline: null, startsAt: null, endsAt: null,
};

/** Screens 82–83: campaign builder (basics, terms & budget, eligibility, deliverables, disclosure, timeline). */
export function CampaignEditorPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const existing = useQuery({ queryKey: bqk.campaign(id ?? 'new'), queryFn: () => repo.getCampaign(id!), enabled: !!id });
  const products = useQuery({ queryKey: bqk.products(org.id), queryFn: () => repo.listOrgProducts(org.id) });
  const [f, setF] = useState<CampaignInput>(EMPTY);
  useEffect(() => {
    if (existing.data) { const { id: _i, organizationId: _o, brandProfileId: _b, status: _s, rejectionNote: _r, createdAt: _c, isSample: _x, ...rest } = existing.data; setF(rest); }
  }, [existing.data]);
  const locked = !!existing.data && existing.data.status !== 'draft';
  const set = <K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const c = await repo.saveCampaign(org.id, f, id);
      return submit ? repo.setCampaignStatus(c.id, 'pending_approval') : c;
    },
    onSuccess: (c, submit) => { qc.invalidateQueries({ queryKey: ['brand'] }); toast({ variant: 'success', title: t(submit ? 'campaigns.submitted' : 'campaigns.saved') }); nav(`/brand/campaigns/${c.id}`, { replace: true }); },
    onError,
  });
  const termsInvalid = (f.type !== 'affiliate' && !(f.fixedFee && f.fixedFee > 0)) || (f.type !== 'fixed_fee' && !(f.commissionBps && f.commissionBps > 0)) || (!!f.startsAt && !!f.endsAt && f.endsAt <= f.startsAt);
  if (!canManage) return <ReadOnlyNote />;
  if (id && existing.isLoading) return <ListSkeleton />;
  return (
    <div className="max-w-2xl">
      <PageHead title={id ? t('campaigns.edit') : t('screens.campaignCreate')} desc={t('campaigns.builderDesc')} />
      {locked && <p className="mb-4 rounded-md bg-warning/10 p-3 text-xs">{t('campaigns.lockedNote')}</p>}
      <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); save.mutate(false); }}>
        <section className="space-y-4">
          <SectionTitle>{t('campaigns.sections.basics')}</SectionTitle>
          <Field label={t('campaigns.title')}>{(p) => <Input {...p} required minLength={3} maxLength={120} value={f.title} onChange={(e) => set('title', e.target.value)} />}</Field>
          <Field label={t('campaigns.objective')}>{(p) => <Select {...p} value={f.objective} onChange={(e) => set('objective', e.currentTarget.value as CampaignInput['objective'])}>{(['awareness', 'traffic', 'sales', 'launch'] as const).map((o) => <option key={o} value={o}>{t(`campaigns.objectives.${o}` as TKey)}</option>)}</Select>}</Field>
          <Field label={t('campaigns.brief')} hint={t('campaigns.briefHint')}>{(p) => <Textarea {...p} rows={5} maxLength={5000} value={f.brief} onChange={(e) => set('brief', e.target.value)} />}</Field>
        </section>
        <section id="budget" className="space-y-4">
          <SectionTitle>{t('campaigns.sections.terms')}</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('campaigns.type')}>
            {(['fixed_fee', 'affiliate', 'hybrid'] as CampaignType[]).map((ty) => (
              <button key={ty} type="button" role="radio" aria-checked={f.type === ty} disabled={locked} onClick={() => set('type', ty)} className={`rounded-md border p-3 text-start text-sm ${f.type === ty ? 'border-primary bg-primary-soft/50' : 'border-line'}`}>
                <span className="block font-semibold">{t(`campaigns.types.${ty}` as TKey)}</span><span className="text-xs text-muted">{t(`campaigns.typeDesc.${ty}` as TKey)}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('locale.currency')}>{(p) => <Select {...p} disabled={locked} value={f.currency} onChange={(e) => set('currency', e.currentTarget.value)}>{['TRY', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
            {f.type !== 'affiliate' && <Field label={t('campaigns.fixedFee')}>{(p) => <Input {...p} disabled={locked} type="number" min={1} step="0.01" value={f.fixedFee ?? ''} onChange={(e) => set('fixedFee', e.target.value ? Number(e.target.value) : null)} />}</Field>}
            {f.type !== 'fixed_fee' && <Field label={t('campaigns.commissionPct')} hint={t('campaigns.commissionHint')}>{(p) => <Input {...p} disabled={locked} type="number" min={0.01} max={100} step="0.01" value={f.commissionBps !== null ? f.commissionBps / 100 : ''} onChange={(e) => set('commissionBps', e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />}</Field>}
          </div>
          <Field label={t('campaigns.budget')} hint={t('campaigns.budgetHint')}>{(p) => <Input {...p} disabled={locked} type="number" min={1} step="0.01" value={f.budget ?? ''} onChange={(e) => set('budget', e.target.value ? Number(e.target.value) : null)} />}</Field>
        </section>
        <section className="space-y-4">
          <SectionTitle>{t('campaigns.sections.eligibility')}</SectionTitle>
          <fieldset><legend className="mb-2 text-sm font-medium">{t('campaigns.countries')}</legend>
            <div className="flex flex-wrap gap-2">{COUNTRIES.slice(0, 8).map((c) => <Chip key={c.code} active={f.countries.includes(c.code)} onClick={() => set('countries', f.countries.includes(c.code) ? f.countries.filter((x) => x !== c.code) : [...f.countries, c.code])}>{c.flag} {c.code}</Chip>)}</div>
            <p className="mt-1 text-xs text-muted">{t('campaigns.countriesHint')}</p>
          </fieldset>
          <fieldset><legend className="mb-2 text-sm font-medium">{t('campaigns.categories')}</legend>
            <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c.slug} active={f.categories.includes(c.slug)} onClick={() => set('categories', f.categories.includes(c.slug) ? f.categories.filter((x) => x !== c.slug) : [...f.categories, c.slug])}>{t(`categories.${c.slug}` as TKey)}</Chip>)}</div>
          </fieldset>
          <Field label={t('campaigns.minFollowers')}>{(p) => <Input {...p} disabled={locked} type="number" min={0} step={100} value={f.minFollowers} onChange={(e) => set('minFollowers', Math.max(0, Number(e.target.value)))} />}</Field>
        </section>
        <section className="space-y-4">
          <SectionTitle>{t('campaigns.sections.deliverables')}</SectionTitle>
          {f.deliverables.map((d, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={t('campaigns.format')} className="flex-1">{(p) => <Select {...p} value={d.kind} onChange={(e) => set('deliverables', f.deliverables.map((x, j) => (j === i ? { ...x, kind: e.currentTarget.value as CampaignDeliverableSpec['kind'] } : x)))}>{(['post', 'carousel', 'video'] as const).map((k) => <option key={k} value={k}>{t(`campaigns.formats.${k}` as TKey)}</option>)}</Select>}</Field>
              <Field label={t('campaigns.count')} className="w-24">{(p) => <Input {...p} type="number" min={1} max={20} value={d.count} onChange={(e) => set('deliverables', f.deliverables.map((x, j) => (j === i ? { ...x, count: Math.max(1, Number(e.target.value)) } : x)))} />}</Field>
              <Button type="button" variant="ghost" size="icon" disabled={f.deliverables.length === 1} onClick={() => set('deliverables', f.deliverables.filter((_, j) => j !== i))} aria-label={t('common.remove')}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => set('deliverables', [...f.deliverables, { kind: 'post', count: 1 }])}><Plus className="h-4 w-4" />{t('campaigns.addDeliverable')}</Button>
          <Field label={t('campaigns.disclosure')} hint={t('campaigns.disclosureHint')}>{(p) => <Select {...p} disabled={locked} value={f.requiredDisclosure} onChange={(e) => set('requiredDisclosure', e.currentTarget.value as Exclude<Disclosure, 'none'>)}>{(['sponsored', 'affiliate', 'gifted'] as const).map((d) => <option key={d} value={d}>{t(`disclosure.${d}` as TKey)}</option>)}</Select>}</Field>
          <fieldset><legend className="mb-2 text-sm font-medium">{t('campaigns.products')}</legend>
            {!products.data?.length ? <p className="text-xs text-muted">{t('campaigns.noProducts')} <Link to="/brand/catalog/new" className="font-semibold text-primary">{t('brand.newProduct')}</Link></p> : (
              <div className="flex flex-wrap gap-2">{products.data.map((p) => <Chip key={p.id} active={f.productIds.includes(p.id)} onClick={() => set('productIds', f.productIds.includes(p.id) ? f.productIds.filter((x) => x !== p.id) : [...f.productIds, p.id])}>{p.title}</Chip>)}</div>
            )}
          </fieldset>
        </section>
        <section className="space-y-4">
          <SectionTitle>{t('campaigns.sections.timeline')}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('campaigns.deadline')}>{(p) => <Input {...p} type="date" value={isoDate(f.applicationDeadline)} onChange={(e) => set('applicationDeadline', fromDate(e.target.value))} />}</Field>
            <Field label={t('campaigns.starts')}>{(p) => <Input {...p} type="date" value={isoDate(f.startsAt)} onChange={(e) => set('startsAt', fromDate(e.target.value))} />}</Field>
            <Field label={t('campaigns.ends')} error={f.startsAt && f.endsAt && f.endsAt <= f.startsAt ? t('campaigns.endsInvalid') : undefined}>{(p) => <Input {...p} type="date" value={isoDate(f.endsAt)} onChange={(e) => set('endsAt', fromDate(e.target.value))} />}</Field>
          </div>
        </section>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button type="submit" variant="secondary" loading={save.isPending && save.variables === false} disabled={termsInvalid || f.title.trim().length < 3}>{t('campaigns.saveDraft')}</Button>
          {(!existing.data || existing.data.status === 'draft') && <Button type="button" onClick={() => save.mutate(true)} loading={save.isPending && save.variables === true} disabled={termsInvalid || f.title.trim().length < 3}><Send className="h-4 w-4" />{t('campaigns.submit')}</Button>}
        </div>
        <p className="text-xs text-muted">{t('campaigns.approvalNote')}</p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
const ACTIONS: Partial<Record<CampaignStatus, CampaignStatus[]>> = {
  draft: ['pending_approval', 'cancelled'], pending_approval: ['draft', 'cancelled'], open: ['in_progress', 'paused', 'cancelled'], paused: ['open', 'in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'],
};

export function CampaignDetailPage() {
  const { id = '' } = useParams();
  const { t, date, num } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { isModerator } = useAuth();
  const { canManage } = useBrand();
  const c = useQuery({ queryKey: bqk.campaign(id), queryFn: () => repo.getCampaign(id) });
  const parts = useQuery({ queryKey: ['brand', 'participants', id], queryFn: () => repo.listCampaignParticipants(id), enabled: !!c.data });
  const perf = useQuery({ queryKey: ['brand', 'perf', id], queryFn: () => repo.getCampaignPerformance(id), enabled: !!c.data });
  const people = useProfilesMap((parts.data ?? []).map((p) => p.creatorId));
  const [confirm, setConfirm] = useState<CampaignStatus | null>(null);
  const [note, setNote] = useState('');
  const move = useMutation({
    mutationFn: (s: CampaignStatus) => repo.setCampaignStatus(id, s, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand'] }); setConfirm(null); toast({ variant: 'success', title: t('campaigns.statusUpdated') }); },
    onError,
  });
  if (c.isLoading) return <ListSkeleton />;
  if (!c.data) return <EmptyState title={t('common.notFound')} />;
  const cp = c.data;
  return (
    <div>
      <PageHead title={cp.title} action={<CampaignStatusBadge status={cp.status} />} />
      <div className="mb-4"><CampaignTerms c={cp} /></div>
      {cp.status === 'draft' && cp.rejectionNote && <p className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">{t('campaigns.returned')}: {cp.rejectionNote}</p>}
      <div className="mb-6 flex flex-wrap gap-2">
        {cp.status === 'draft' && canManage && <Button asChild variant="secondary"><Link to={`/brand/campaigns/${cp.id}/edit`}>{t('campaigns.edit')}</Link></Button>}
        {(cp.status === 'open' || cp.status === 'in_progress') && canManage && <Button asChild variant="secondary"><Link to={`/brand/creators?campaign=${cp.id}`}><Users className="h-4 w-4" />{t('campaigns.inviteCreators')}</Link></Button>}
        {canManage && (ACTIONS[cp.status] ?? []).map((s) => <Button key={s} variant={s === 'cancelled' ? 'danger' : 'secondary'} onClick={() => setConfirm(s)}>{t(`campaigns.actions.${s}` as TKey)}</Button>)}
        {isModerator && cp.status === 'pending_approval' && (
          <>
            <Button onClick={() => setConfirm('open')}><Check className="h-4 w-4" />{t('campaigns.approve')}</Button>
            <Button variant="danger" onClick={() => setConfirm('draft')}><X className="h-4 w-4" />{t('campaigns.returnToDraft')}</Button>
          </>
        )}
      </div>
      {perf.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <CreatorAnalyticsCard icon={<Users />} label={t('campaigns.participants')} value={num(perf.data.participants)} />
          <CreatorAnalyticsCard icon={<ClipboardCheck />} label={t('campaigns.deliverablesApproved')} value={num(perf.data.deliverablesApproved)} hint={t('campaigns.pendingN', { n: perf.data.deliverablesPending })} />
          <CreatorAnalyticsCard icon={<Eye />} label={t('studio.views')} value={num(perf.data.views)} />
          <CreatorAnalyticsCard icon={<Wallet />} label={t('campaigns.committedFees')} value={`${num(perf.data.committedFees)} ${cp.currency}`} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-2 p-4 text-sm">
          <h2 className="font-semibold">{t('campaigns.details')}</h2>
          <p className="whitespace-pre-line text-muted">{cp.brief || '—'}</p>
          <p><span className="text-muted">{t('campaigns.objective')}:</span> {t(`campaigns.objectives.${cp.objective}` as TKey)}</p>
          <p><span className="text-muted">{t('campaigns.countries')}:</span> {cp.countries.map((x) => getCountry(x).flag).join(' ') || t('search.any')}</p>
          <p><span className="text-muted">{t('campaigns.sections.deliverables')}:</span> {cp.deliverables.map((d) => `${d.count}× ${t(`campaigns.formats.${d.kind}` as TKey)}`).join(', ')}</p>
          <p><span className="text-muted">{t('campaigns.disclosure')}:</span> {t(`disclosure.${cp.requiredDisclosure}` as TKey)}</p>
          {cp.budget !== null && <p><span className="text-muted">{t('campaigns.budget')}:</span> <CurrencyDisplay amount={cp.budget} currency={cp.currency} /></p>}
          <p><span className="text-muted">{t('campaigns.sections.timeline')}:</span> {cp.applicationDeadline ? `${t('campaigns.deadline')} ${date(cp.applicationDeadline)} · ` : ''}{cp.startsAt ? date(cp.startsAt) : '…'} → {cp.endsAt ? date(cp.endsAt) : '…'}</p>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">{t('campaigns.participants')}</h2>
          {!parts.data?.length ? <p className="text-sm text-muted">{t('campaigns.noParticipants')}</p> : (
            <ul className="space-y-2">{parts.data.map((p) => { const pr = people.data?.get(p.creatorId); return (
              <li key={p.creatorId} className="flex items-center gap-3"><CreatorAvatar profile={pr} size="sm" /><Link to={pr ? `/@${pr.username}` : '#'} className="flex-1 text-sm font-semibold">{pr?.displayName}</Link>
                {p.agreedFee !== null && <CurrencyDisplay amount={p.agreedFee} currency={cp.currency} className="text-xs" />}<Badge tone="outline">{t(`campaigns.source.${p.source}` as TKey)}</Badge></li>
            ); })}</ul>
          )}
        </Card>
      </div>
      <ConfirmationDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={confirm ? t(`campaigns.actions.${confirm}` as TKey) : ''} description={confirm === 'pending_approval' ? t('campaigns.submitConfirm') : confirm === 'cancelled' ? t('campaigns.cancelConfirm') : undefined}
        confirmLabel={t('common.continue')} danger={confirm === 'cancelled'} loading={move.isPending} onConfirm={() => confirm && move.mutate(confirm)}>
        {isModerator && confirm === 'draft' && cp.status === 'pending_approval' && <Field label={t('campaigns.returnNote')}>{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>}
      </ConfirmationDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
function InviteDialog({ creator, onOpenChange, presetCampaign }: { creator: CreatorCard; onOpenChange: (o: boolean) => void; presetCampaign?: string | null }) {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { membership } = useBrand();
  const campaigns = useQuery({ queryKey: bqk.campaigns(membership.organization.id), queryFn: () => repo.listCampaigns(membership.organization.id) });
  const invitable = (campaigns.data ?? []).filter((c) => ['open', 'in_progress', 'paused'].includes(c.status));
  const [cid, setCid] = useState(presetCampaign ?? '');
  const [msg, setMsg] = useState('');
  const send = useMutation({ mutationFn: () => repo.inviteCreator(cid || invitable[0]!.id, creator.profile.id, msg), onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand'] }); toast({ variant: 'success', title: t('discovery.invited') }); onOpenChange(false); }, onError });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('discovery.inviteTitle', { name: creator.profile.displayName })}>
      {!invitable.length ? <p className="text-sm text-muted">{t('discovery.noOpenCampaign')}</p> : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <Field label={t('screens.campaignList')}>{(p) => <Select {...p} value={cid || invitable[0]!.id} onChange={(e) => setCid(e.currentTarget.value)}>{invitable.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
          <Field label={t('discovery.message')}>{(p) => <Textarea {...p} maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} />}</Field>
          <Button type="submit" block loading={send.isPending}><Mail className="h-4 w-4" />{t('discovery.sendInvite')}</Button>
        </form>
      )}
    </Modal>
  );
}

export function CreatorDiscoveryPage() {
  const { t, compact } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { canManage } = useBrand();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [minFollowers, setMin] = useState(0);
  const [verified, setVerified] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [inviting, setInviting] = useState<CreatorCard | null>(null);
  const res = useQuery({ queryKey: ['brand', 'discover', q, category, country, minFollowers, verified], queryFn: () => repo.discoverCreators({ q, category: category || null, country: country || null, minFollowers, verifiedOnly: verified }) });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.creatorDiscovery')} desc={t('discovery.desc')} action={compare.length > 1 && <Button onClick={() => nav(`/brand/creators/compare?ids=${compare.join(',')}`)}><Scale className="h-4 w-4" />{t('discovery.compareN', { n: compare.length })}</Button>} />
      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={t('nav.search')}>{(p) => <Input {...p} value={q} onChange={(e) => setQ(e.target.value)} />}</Field>
        <Field label={t('search.category')}>{(p) => <Select {...p} value={category} onChange={(e) => setCategory(e.currentTarget.value)}><option value="">{t('categories.all')}</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(`categories.${c.slug}` as TKey)}</option>)}</Select>}</Field>
        <Field label={t('search.country')}>{(p) => <Select {...p} value={country} onChange={(e) => setCountry(e.currentTarget.value)}><option value="">{t('search.any')}</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}</Select>}</Field>
        <Field label={t('campaigns.minFollowers')}>{(p) => <Input {...p} type="number" min={0} step={1000} value={minFollowers} onChange={(e) => setMin(Math.max(0, Number(e.target.value)))} />}</Field>
        <div className="flex items-end"><Switch checked={verified} onCheckedChange={setVerified} label={t('search.verifiedOnly')} /></div>
      </Card>
      {res.isLoading ? <ListSkeleton /> : !res.data?.length ? <EmptyState icon={<Users />} title={t('discovery.none')} /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {res.data.map((c) => (
            <li key={c.profile.id}><Card className="p-4">
              <div className="flex items-center gap-3">
                <CreatorAvatar profile={c.profile} size="md" />
                <div className="min-w-0 flex-1">
                  <Link to={`/@${c.profile.username}`} className="flex items-center gap-1 font-semibold"><span className="truncate">{c.profile.displayName}</span>{c.profile.verified && <VerifiedBadge className="h-4 w-4" />}</Link>
                  <p className="text-xs text-muted">@{c.profile.username} · {getCountry(c.profile.country).flag} {c.profile.isSample && <SampleBadge className="ms-1" />}</p>
                </div>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={compare.includes(c.profile.id)} disabled={!compare.includes(c.profile.id) && compare.length >= 3} onChange={(e) => setCompare(e.target.checked ? [...compare, c.profile.id] : compare.filter((x) => x !== c.profile.id))} className="h-4 w-4 accent-[#7047EB]" />{t('discovery.compare')}</label>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div><dt className="text-muted">{t('profile.followers')}</dt><dd className="text-sm font-semibold">{compact(c.profile.followerCount)}</dd></div>
                <div><dt className="text-muted">{t('profile.posts')}</dt><dd className="text-sm font-semibold">{c.posts}</dd></div>
                <div><dt className="text-muted">{t('analytics.er')}</dt><dd className="text-sm font-semibold">{c.avgEngagementRate}%</dd></div>
                <div><dt className="text-muted">{t('discovery.disclosed')}</dt><dd className="text-sm font-semibold">{c.disclosedShare}%</dd></div>
              </dl>
              {c.categories.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.categories.map((x) => <Badge key={x} tone="outline">{t(`categories.${x}` as TKey)}</Badge>)}</div>}
              {canManage && <Button size="sm" variant="secondary" className="mt-3" onClick={() => setInviting(c)}><Mail className="h-4 w-4" />{t('discovery.invite')}</Button>}
            </Card></li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">{t('discovery.metricsNote')}</p>
      {inviting && <InviteDialog creator={inviting} presetCampaign={params.get('campaign')} onOpenChange={(o) => !o && setInviting(null)} />}
    </div>
  );
}

export function CreatorComparePage() {
  const { t, compact } = useI18n();
  const repo = useRepo();
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const res = useQuery({ queryKey: ['brand', 'discover', 'all'], queryFn: () => repo.discoverCreators({}) });
  const cards = useMemo(() => ids.map((id) => res.data?.find((c) => c.profile.id === id)).filter((c): c is CreatorCard => !!c), [ids, res.data]);
  const rows: [TKey, (c: CreatorCard) => React.ReactNode][] = [
    ['profile.followers', (c) => compact(c.profile.followerCount)], ['profile.posts', (c) => c.posts], ['analytics.er', (c) => `${c.avgEngagementRate}%`],
    ['discovery.disclosed', (c) => `${c.disclosedShare}%`], ['settings.country', (c) => `${getCountry(c.profile.country).flag} ${c.profile.country}`],
    ['campaigns.categories', (c) => c.categories.map((x) => t(`categories.${x}` as TKey)).join(', ') || '—'], ['profile.verified', (c) => (c.profile.verified ? '✓' : '—')],
  ];
  return (
    <div>
      <PageHead title={t('screens.creatorComparison')} />
      {res.isLoading ? <ListSkeleton /> : cards.length < 2 ? <EmptyState title={t('discovery.pickTwo')} action={<Button asChild variant="secondary"><Link to="/brand/creators">{t('screens.creatorDiscovery')}</Link></Button>} /> : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr><th className="p-3" />{cards.map((c) => <th key={c.profile.id} className="p-3 text-center"><CreatorAvatar profile={c.profile} size="md" /><p className="mt-1 font-semibold">{c.profile.displayName}</p></th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map(([k, fn]) => <tr key={k}><th className="p-3 text-start text-xs font-medium text-muted">{t(k)}</th>{cards.map((c) => <td key={c.profile.id} className="p-3 text-center">{fn(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function useOrgCampaignMap() {
  const repo = useRepo();
  const { membership } = useBrand();
  const q = useQuery({ queryKey: bqk.campaigns(membership.organization.id), queryFn: () => repo.listCampaigns(membership.organization.id) });
  return new Map((q.data ?? []).map((c) => [c.id, c] as [string, Campaign]));
}

export function ApplicationsPage() {
  const { t, relative } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const q = useQuery({ queryKey: bqk.apps(org.id), queryFn: () => repo.listOrgApplications(org.id) });
  const camps = useOrgCampaignMap();
  const people = useProfilesMap((q.data ?? []).map((a) => a.creatorId));
  const review = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => repo.reviewApplication(id, accept), onSuccess: () => qc.invalidateQueries({ queryKey: ['brand'] }), onError });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.applications')} />
      {q.isLoading ? <ListSkeleton /> : !q.data?.length ? <EmptyState icon={<Inbox />} title={t('brand.noApplications')} /> : (
        <ul className="space-y-2">{q.data.map((a) => { const p = people.data?.get(a.creatorId); const c = camps.get(a.campaignId); return (
          <li key={a.id}><Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <CreatorAvatar profile={p} size="sm" />
              <div className="min-w-0 flex-1"><Link to={p ? `/@${p.username}` : '#'} className="font-semibold">{p?.displayName}</Link><p className="text-xs text-muted">{c?.title} · {relative(a.createdAt)}</p></div>
              <Badge tone={a.status === 'accepted' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning'}>{t(`brand.appStatus.${a.status}` as TKey)}</Badge>
            </div>
            {a.pitch && <p className="mt-2 whitespace-pre-line text-sm">{a.pitch}</p>}
            {a.proposedFee !== null && c && <p className="mt-1 text-xs text-muted">{t('brand.proposedFee')}: <CurrencyDisplay amount={a.proposedFee} currency={c.currency} /></p>}
            {a.status === 'pending' && canManage && (
              <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => review.mutate({ id: a.id, accept: true })}><Check className="h-4 w-4" />{t('brand.accept')}</Button><Button size="sm" variant="secondary" onClick={() => review.mutate({ id: a.id, accept: false })}><X className="h-4 w-4" />{t('brand.reject')}</Button></div>
            )}
          </Card></li>
        ); })}</ul>
      )}
    </div>
  );
}

export function InvitationsPage() {
  const { t, relative } = useI18n();
  const repo = useRepo();
  const { membership } = useBrand();
  const org = membership.organization;
  const q = useQuery({ queryKey: bqk.invs(org.id), queryFn: () => repo.listOrgInvitations(org.id) });
  const camps = useOrgCampaignMap();
  const people = useProfilesMap((q.data ?? []).map((a) => a.creatorId));
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.invitations')} action={<Button asChild variant="secondary"><Link to="/brand/creators">{t('screens.creatorDiscovery')}</Link></Button>} />
      {q.isLoading ? <ListSkeleton /> : !q.data?.length ? <EmptyState icon={<Mail />} title={t('brand.noInvitations')} /> : (
        <ul className="divide-y divide-line rounded-md border border-line">{q.data.map((i) => { const p = people.data?.get(i.creatorId); return (
          <li key={i.id} className="flex items-center gap-3 p-3"><CreatorAvatar profile={p} size="sm" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p?.displayName}</p><p className="text-xs text-muted">{camps.get(i.campaignId)?.title} · {relative(i.createdAt)}</p></div>
            <Badge tone={i.status === 'accepted' ? 'success' : i.status === 'declined' ? 'danger' : 'neutral'}>{t(`brand.invStatus.${i.status}` as TKey)}</Badge></li>
        ); })}</ul>
      )}
    </div>
  );
}

export function DeliverablesPage() {
  const { t, relative } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { membership, canManage } = useBrand();
  const org = membership.organization;
  const q = useQuery({ queryKey: bqk.dels(org.id), queryFn: () => repo.listOrgDeliverables(org.id) });
  const camps = useOrgCampaignMap();
  const people = useProfilesMap((q.data ?? []).map((a) => a.creatorId));
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const review = useMutation({ mutationFn: ({ id, approve }: { id: string; approve: boolean }) => repo.reviewDeliverable(id, approve, feedback[id] ?? ''), onSuccess: () => qc.invalidateQueries({ queryKey: ['brand'] }), onError });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={t('screens.deliverables')} desc={t('brand.deliverablesDesc')} />
      {q.isLoading ? <ListSkeleton /> : !q.data?.length ? <EmptyState icon={<ClipboardCheck />} title={t('brand.noDeliverables')} /> : (
        <ul className="space-y-2">{q.data.map((d) => { const p = people.data?.get(d.creatorId); return (
          <li key={d.id}><Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <CreatorAvatar profile={p} size="sm" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{p?.displayName}</p><p className="text-xs text-muted">{camps.get(d.campaignId)?.title} · {relative(d.submittedAt)}</p></div>
              <Badge tone={d.status === 'approved' ? 'success' : d.status === 'changes_requested' ? 'warning' : 'primary'}>{t(`brand.delStatus.${d.status}` as TKey)}</Badge>
              <Button asChild size="sm" variant="secondary"><Link to={`/p/${d.postId}`}>{t('brand.viewPost')}</Link></Button>
            </div>
            {d.note && <p className="mt-2 text-sm">{d.note}</p>}
            {d.feedback && <p className="mt-1 text-xs text-muted">{t('brand.feedback')}: {d.feedback}</p>}
            {d.status === 'submitted' && canManage && (
              <div className="mt-3 space-y-2">
                <Input value={feedback[d.id] ?? ''} onChange={(e) => setFeedback({ ...feedback, [d.id]: e.target.value })} placeholder={t('brand.feedbackPlaceholder')} aria-label={t('brand.feedback')} />
                <div className="flex gap-2"><Button size="sm" onClick={() => review.mutate({ id: d.id, approve: true })}><BadgeCheck className="h-4 w-4" />{t('brand.approve')}</Button><Button size="sm" variant="secondary" onClick={() => review.mutate({ id: d.id, approve: false })}>{t('brand.requestChanges')}</Button></div>
              </div>
            )}
          </Card></li>
        ); })}</ul>
      )}
    </div>
  );
}

export function CollabInboxPage() {
  const { t } = useI18n();
  const { session } = useAuth();
  const convs = useConversations();
  const list = (convs.data ?? []).filter((c) => c.kind === 'collaboration');
  const profiles = useProfilesMap(list.flatMap((c) => c.participantIds));
  return (
    <div className="max-w-2xl">
      <OrgSwitcher />
      <PageHead title={t('screens.collabInbox')} desc={t('brand.collabDesc')} />
      {convs.isLoading ? <ListSkeleton /> : !list.length ? <EmptyState icon={<Inbox />} title={t('messages.empty.collaboration')} description={t('messages.emptyDesc.collaboration')} /> : (
        <Card><ConversationList items={list} profiles={profiles.data} me={session!.userId} /></Card>
      )}
    </div>
  );
}

export function CampaignPerformancePage({ roi }: { roi?: boolean }) {
  const { t, num } = useI18n();
  const repo = useRepo();
  const { membership } = useBrand();
  const org = membership.organization;
  const camps = useQuery({ queryKey: bqk.campaigns(org.id), queryFn: () => repo.listCampaigns(org.id) });
  const active = (camps.data ?? []).filter((c) => !['draft', 'pending_approval', 'cancelled'].includes(c.status));
  const perf = useQuery({ queryKey: ['brand', org.id, 'perf', active.map((c) => c.id).join(',')], queryFn: () => Promise.all(active.map((c) => repo.getCampaignPerformance(c.id))), enabled: active.length > 0 });
  return (
    <div>
      <OrgSwitcher />
      <PageHead title={roi ? t('screens.roiReporting') : t('screens.campaignPerformance')} desc={roi ? t('brand.roiDesc') : t('brand.perfDesc')} />
      {camps.isLoading || perf.isLoading ? <ListSkeleton /> : !active.length ? <EmptyState icon={<BarChart3 />} title={t('brand.noPerf')} /> : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-xs text-muted"><tr>
              <th className="p-3 text-start font-medium">{t('campaigns.title')}</th>
              <th className="p-3 text-end font-medium">{t('campaigns.participants')}</th>
              <th className="p-3 text-end font-medium"><Eye className="inline h-3.5 w-3.5" /> {t('studio.views')}</th>
              <th className="p-3 text-end font-medium"><Heart className="inline h-3.5 w-3.5" /> {t('brand.engagements')}</th>
              <th className="p-3 text-end font-medium"><MousePointerClick className="inline h-3.5 w-3.5" /> {t('analytics.clicks')}</th>
              <th className="p-3 text-end font-medium">{t('earnings.confirmed')}</th>
              <th className="p-3 text-end font-medium">{t('campaigns.committedFees')}</th>
              {roi && <th className="p-3 text-end font-medium">{t('brand.costPerEngagement')}</th>}
            </tr></thead>
            <tbody className="divide-y divide-line">{active.map((c, i) => { const p = perf.data?.[i]; return (
              <tr key={c.id}>
                <td className="p-3"><Link to={`/brand/campaigns/${c.id}`} className="font-medium hover:underline">{c.title}</Link></td>
                <td className="p-3 text-end tabular-nums">{num(p?.participants ?? 0)}</td>
                <td className="p-3 text-end tabular-nums">{num(p?.views ?? 0)}</td>
                <td className="p-3 text-end tabular-nums">{num(p?.engagements ?? 0)}</td>
                <td className="p-3 text-end tabular-nums">{num(p?.productClicks ?? 0)}</td>
                <td className="p-3 text-end tabular-nums">{num(p?.confirmedConversions ?? 0)}</td>
                <td className="p-3 text-end tabular-nums"><CurrencyDisplay amount={p?.committedFees ?? 0} currency={c.currency} /></td>
                {roi && <td className="p-3 text-end tabular-nums">{p && p.engagements > 0 && p.committedFees > 0 ? <CurrencyDisplay amount={p.committedFees / p.engagements} currency={c.currency} /> : '—'}</td>}
              </tr>
            ); })}</tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{roi ? t('brand.roiNote') : t('brand.perfNote')}</p>
    </div>
  );
}
