import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Check, X, ClipboardCheck, Mail, Info } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useErrorToast, useProfilesMap } from '@/data/hooks';
import type { Campaign } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui/misc';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { EmptyState, ListSkeleton } from '@/components/common/States';
import { CreatorAvatar } from '@/components/common/CreatorAvatar';
import { CampaignStatusBadge, CampaignTerms, PageHead } from '@/pages/brand/brandCommon';
import { getCountry } from '@/i18n/locales';

const cqk = { open: ['creator', 'campaigns', 'open'] as const, mine: ['creator', 'campaigns', 'mine'] as const };

function useCampaignLookup(ids: string[]) {
  const repo = useRepo();
  const unique = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ['creator', 'campaigns', 'byId', unique.join(',')],
    queryFn: async () => new Map((await Promise.all(unique.map((id) => repo.getCampaign(id)))).filter((c): c is Campaign => !!c).map((c) => [c.id, c])),
    enabled: unique.length > 0,
  });
}

function eligibilityReasons(c: Campaign, followers: number, country: string, isCreator: boolean, t: (k: TKey, v?: Record<string, string | number>) => string) {
  const r: string[] = [];
  if (!isCreator) r.push(t('opps.reasonCreator'));
  if (followers < c.minFollowers) r.push(t('opps.reasonFollowers', { n: c.minFollowers.toLocaleString() }));
  if (c.countries.length && !c.countries.includes(country)) r.push(t('opps.reasonCountry'));
  return r;
}

export function OpportunitiesPage() {
  const { t, date } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { profile } = useAuth();
  const open = useQuery({ queryKey: cqk.open, queryFn: () => repo.listOpenCampaigns() });
  const mine = useQuery({ queryKey: cqk.mine, queryFn: () => repo.listMyApplications() });
  const brands = useProfilesMap((open.data ?? []).map((c) => c.brandProfileId ?? ''));
  const [applying, setApplying] = useState<Campaign | null>(null);
  const [pitch, setPitch] = useState('');
  const [fee, setFee] = useState('');
  const apply = useMutation({
    mutationFn: () => repo.applyToCampaign(applying!.id, pitch, fee ? Number(fee) : null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creator'] }); toast({ variant: 'success', title: t('opps.applied') }); setApplying(null); setPitch(''); setFee(''); },
    onError,
  });
  const applied = new Map((mine.data ?? []).filter((a) => a.status !== 'withdrawn').map((a) => [a.campaignId, a.status]));
  return (
    <div>
      <PageHead title={t('screens.campaignOpportunities')} desc={t('opps.desc')} action={<Button asChild variant="secondary"><Link to="/studio/campaigns/applications">{t('screens.campaignApplications')}</Link></Button>} />
      {open.isLoading ? <ListSkeleton /> : !open.data?.length ? <EmptyState icon={<Megaphone />} title={t('opps.none')} /> : (
        <ul className="space-y-3">
          {open.data.map((c) => {
            const brand = brands.data?.get(c.brandProfileId ?? '');
            const reasons = profile ? eligibilityReasons(c, profile.followerCount, profile.country, profile.isCreator, t) : [];
            const status = applied.get(c.id);
            return (
              <li key={c.id}><Card className="p-4">
                <div className="flex items-start gap-3">
                  <CreatorAvatar profile={brand} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{brand?.displayName}</p>
                    <h2 className="font-semibold">{c.title}</h2>
                    <div className="mt-1"><CampaignTerms c={c} /></div>
                  </div>
                </div>
                {c.brief && <p className="mt-3 line-clamp-3 text-sm text-fg/90">{c.brief}</p>}
                <p className="mt-2 text-xs text-muted">
                  {c.deliverables.map((d) => `${d.count}× ${t(`campaigns.formats.${d.kind}` as TKey)}`).join(', ')} · {t('campaigns.disclosure')}: {t(`disclosure.${c.requiredDisclosure}` as TKey)}
                  {c.countries.length > 0 && ` · ${c.countries.map((x) => getCountry(x).flag).join(' ')}`}
                  {c.applicationDeadline && ` · ${t('campaigns.deadline')} ${date(c.applicationDeadline)}`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {status ? <Badge tone={status === 'accepted' ? 'success' : status === 'rejected' ? 'danger' : 'warning'}>{t(`brand.appStatus.${status}` as TKey)}</Badge>
                    : reasons.length ? <p className="flex items-start gap-1.5 text-xs text-muted"><Info className="h-4 w-4 shrink-0" />{t('opps.notEligible')}: {reasons.join(' · ')}</p>
                      : <Button size="sm" onClick={() => setApplying(c)}><Send className="h-4 w-4" />{t('opps.apply')}</Button>}
                </div>
              </Card></li>
            );
          })}
        </ul>
      )}
      {applying && (
        <Modal open onOpenChange={(o) => !o && setApplying(null)} title={t('opps.applyTo', { title: applying.title })}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
            <Field label={t('opps.pitch')} hint={t('opps.pitchHint')}>{(p) => <Textarea {...p} rows={5} maxLength={2000} value={pitch} onChange={(e) => setPitch(e.target.value)} required />}</Field>
            {applying.type !== 'affiliate' && <Field label={t('opps.proposedFee', { currency: applying.currency })} hint={t('opps.feeHint')}>{(p) => <Input {...p} type="number" min={1} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder={String(applying.fixedFee ?? '')} />}</Field>}
            <p className="text-xs text-muted">{t('opps.disclosureReminder', { d: t(`disclosure.${applying.requiredDisclosure}` as TKey) })}</p>
            <Button type="submit" block loading={apply.isPending} disabled={!pitch.trim()}>{t('opps.send')}</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function MyApplicationsPage() {
  const { t, relative } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const apps = useQuery({ queryKey: cqk.mine, queryFn: () => repo.listMyApplications() });
  const invs = useQuery({ queryKey: ['creator', 'invitations'], queryFn: () => repo.listMyInvitations() });
  const camps = useCampaignLookup([...(apps.data ?? []).map((a) => a.campaignId), ...(invs.data ?? []).map((i) => i.campaignId)]);
  const withdraw = useMutation({ mutationFn: (id: string) => repo.withdrawApplication(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['creator'] }), onError });
  const respond = useMutation({ mutationFn: ({ id, accept }: { id: string; accept: boolean }) => repo.respondInvitation(id, accept), onSuccess: () => qc.invalidateQueries({ queryKey: ['creator'] }), onError });
  return (
    <div className="space-y-8">
      <section>
        <PageHead title={t('opps.invitations')} />
        {invs.isLoading ? <ListSkeleton rows={2} /> : !invs.data?.length ? <p className="text-sm text-muted">{t('opps.noInvitations')}</p> : (
          <ul className="space-y-2">{invs.data.map((i) => { const c = camps.data?.get(i.campaignId); return (
            <li key={i.id}><Card className="p-4">
              <div className="flex flex-wrap items-center gap-2"><Mail className="h-4 w-4 text-gold" /><p className="flex-1 font-semibold">{c?.title ?? '…'}</p><Badge tone={i.status === 'accepted' ? 'success' : i.status === 'declined' ? 'danger' : 'warning'}>{t(`brand.invStatus.${i.status}` as TKey)}</Badge></div>
              {c && <div className="mt-1"><CampaignTerms c={c} /></div>}
              {i.message && <p className="mt-2 text-sm">“{i.message}”</p>}
              {i.status === 'sent' && <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => respond.mutate({ id: i.id, accept: true })}><Check className="h-4 w-4" />{t('brand.accept')}</Button><Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: i.id, accept: false })}><X className="h-4 w-4" />{t('opps.decline')}</Button></div>}
            </Card></li>
          ); })}</ul>
        )}
      </section>
      <section>
        <PageHead title={t('screens.campaignApplications')} />
        {apps.isLoading ? <ListSkeleton rows={2} /> : !apps.data?.length ? <EmptyState icon={<Megaphone />} title={t('opps.noApplications')} action={<Button asChild><Link to="/studio/campaigns">{t('screens.campaignOpportunities')}</Link></Button>} /> : (
          <ul className="space-y-2">{apps.data.map((a) => { const c = camps.data?.get(a.campaignId); return (
            <li key={a.id}><Card className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="font-semibold">{c?.title ?? '…'}</p><p className="text-xs text-muted">{relative(a.createdAt)}</p></div>
              <Badge tone={a.status === 'accepted' ? 'success' : a.status === 'rejected' ? 'danger' : a.status === 'withdrawn' ? 'neutral' : 'warning'}>{t(`brand.appStatus.${a.status}` as TKey)}</Badge>
              {a.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => withdraw.mutate(a.id)}>{t('opps.withdraw')}</Button>}
            </Card></li>
          ); })}</ul>
        )}
      </section>
    </div>
  );
}

export function CollaborationsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { session } = useAuth();
  const parts = useQuery({ queryKey: ['creator', 'participations'], queryFn: () => repo.listMyParticipations() });
  const dels = useQuery({ queryKey: ['creator', 'deliverables'], queryFn: () => repo.listMyDeliverables() });
  const posts = useQuery({ queryKey: ['posts', 'author', session?.userId], queryFn: () => repo.listPostsByAuthor(session!.userId), enabled: !!session });
  const camps = useCampaignLookup((parts.data ?? []).map((p) => p.campaignId));
  const [sel, setSel] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const submit = useMutation({
    mutationFn: (campaignId: string) => repo.submitDeliverable(campaignId, sel[campaignId]!, note[campaignId] ?? ''),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creator'] }); toast({ variant: 'success', title: t('collab.submitted') }); },
    onError,
  });
  return (
    <div>
      <PageHead title={t('screens.brandCollaborations')} desc={t('collab.desc')} />
      {parts.isLoading ? <ListSkeleton /> : !parts.data?.length ? <EmptyState icon={<ClipboardCheck />} title={t('collab.none')} action={<Button asChild><Link to="/studio/campaigns">{t('screens.campaignOpportunities')}</Link></Button>} /> : (
        <ul className="space-y-4">{parts.data.map((p) => {
          const c = camps.data?.get(p.campaignId);
          const mine = (dels.data ?? []).filter((d) => d.campaignId === p.campaignId);
          const eligiblePosts = (posts.data ?? []).filter((x) => c && x.disclosure === c.requiredDisclosure && !mine.some((d) => d.postId === x.id && d.status !== 'changes_requested'));
          return (
            <li key={p.campaignId}><Card className="p-4">
              <div className="flex flex-wrap items-center gap-2"><h2 className="flex-1 font-semibold">{c?.title ?? '…'}</h2>{c && <CampaignStatusBadge status={c.status} />}</div>
              {c && <p className="mt-1 text-xs text-muted">{c.deliverables.map((d) => `${d.count}× ${t(`campaigns.formats.${d.kind}` as TKey)}`).join(', ')} · {t('campaigns.disclosure')}: <strong>{t(`disclosure.${c.requiredDisclosure}` as TKey)}</strong></p>}
              {mine.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">{mine.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2"><Link to={`/p/${d.postId}`} className="font-medium text-primary">{t('brand.viewPost')}</Link><Badge tone={d.status === 'approved' ? 'success' : d.status === 'changes_requested' ? 'warning' : 'primary'}>{t(`brand.delStatus.${d.status}` as TKey)}</Badge>{d.feedback && <span className="text-xs text-muted">“{d.feedback}”</span>}</li>
                ))}</ul>
              )}
              {c && ['open', 'in_progress', 'paused'].includes(c.status) && (
                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  <p className="text-sm font-medium">{t('collab.submitTitle')}</p>
                  {!eligiblePosts.length ? <p className="text-xs text-muted">{t('collab.noEligiblePosts', { d: t(`disclosure.${c.requiredDisclosure}` as TKey) })} <Link to="/create" className="font-semibold text-primary">{t('nav.create')}</Link></p> : (
                    <>
                      <Select value={sel[c.id] ?? ''} onChange={(e) => setSel({ ...sel, [c.id]: e.currentTarget.value })} aria-label={t('collab.pickPost')}>
                        <option value="">{t('collab.pickPost')}</option>
                        {eligiblePosts.map((x) => <option key={x.id} value={x.id}>{x.caption.slice(0, 60) || x.id}</option>)}
                      </Select>
                      <Field label={t('collab.note')}>{(pp) => <Input {...pp} value={note[c.id] ?? ''} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} />}</Field>
                      <Button size="sm" disabled={!sel[c.id]} loading={submit.isPending && submit.variables === c.id} onClick={() => submit.mutate(c.id)}>{t('collab.submit')}</Button>
                    </>
                  )}
                </div>
              )}
            </Card></li>
          );
        })}</ul>
      )}
    </div>
  );
}
