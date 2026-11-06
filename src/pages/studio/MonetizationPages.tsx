import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MousePointerClick, ShoppingCart, BadgeCheck, Percent, Wallet, FlaskConical, Copy, Link2, Plus, Banknote, ShieldCheck, FileText, IdCard, Info, Eye, Heart } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useErrorToast, useProducts } from '@/data/hooks';
import type { ConversionStatus, Post } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Card, Chip, Badge, SectionTitle } from '@/components/ui/misc';
import { Field, Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { SampleBadge } from '@/components/common/Labels';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { SmartImage } from '@/components/common/SmartImage';
import { AnalyticsChart, CommissionStatus, CreatorAnalyticsCard, EarningsSummary, PayoutTimeline } from '@/components/monetization';
import { useMarketplaces } from '@/components/commerce/useCommerce';
import { dataMode } from '@/lib/env';

const qk = {
  summary: ['earnings', 'summary'] as const,
  conversions: (s: string) => ['earnings', 'conversions', s] as const,
  links: ['earnings', 'links'] as const,
  payouts: ['earnings', 'payouts'] as const,
  account: ['earnings', 'account'] as const,
  stats: ['earnings', 'stats'] as const,
};

function PageHead({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{title}</h1>{desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}</div>
      {action}
    </div>
  );
}

function SampleImportButton() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const imp = useMutation({
    mutationFn: () => repo.importSampleConversionReport!(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['earnings'] });
      toast({ variant: 'success', title: t('earnings.importDone'), description: t('earnings.importResult', { imported: r.imported, duplicates: r.duplicates, rejected: r.rejected, released: r.released }) });
    },
    onError,
  });
  if (dataMode !== 'demo' || !repo.importSampleConversionReport) return null;
  return <Button variant="secondary" onClick={() => imp.mutate()} loading={imp.isPending}><FlaskConical className="h-4 w-4" />{t('earnings.importSample')}</Button>;
}

// ---------------------------------------------------------------------------
export function EarningsPage() {
  const { t, num } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: qk.summary, queryFn: () => repo.getEarningsSummary() });
  const s = q.data;
  const rate = s && s.clicks ? (s.confirmedConversions / s.clicks) * 100 : 0;
  return (
    <div>
      <PageHead title={t('screens.earnings')} desc={t('earnings.desc')} action={<SampleImportButton />} />
      {dataMode === 'demo' && <p className="mb-4 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs"><FlaskConical className="h-4 w-4 shrink-0 text-warning" />{t('earnings.demoNote')}</p>}
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CreatorAnalyticsCard icon={<MousePointerClick />} label={t('earnings.outboundClicks')} value={num(s!.clicks)} hint={t('earnings.clicksHint')} />
            <CreatorAnalyticsCard icon={<ShoppingCart />} label={t('earnings.reported')} value={num(s!.reportedConversions)} hint={t('earnings.reportedHint')} />
            <CreatorAnalyticsCard icon={<BadgeCheck />} label={t('earnings.confirmed')} value={num(s!.confirmedConversions)} />
            <CreatorAnalyticsCard icon={<Percent />} label={t('earnings.conversionRate')} value={`${rate.toFixed(1)}%`} hint={t('earnings.rateHint')} />
          </div>
          {s!.byCurrency.length === 0 ? (
            <EmptyState icon={<Wallet />} title={t('earnings.empty')} description={t('earnings.emptyDesc')} action={<Button asChild variant="secondary"><Link to="/studio/links">{t('links.title')}</Link></Button>} />
          ) : (
            <section>
              <SectionTitle action={<Link to="/studio/earnings/transactions" className="text-sm font-semibold text-primary">{t('earnings.viewTransactions')}</Link>}>{t('earnings.balances')}</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">{s!.byCurrency.map((e) => <EarningsSummary key={e.currency} e={e} />)}</div>
              <p className="mt-2 text-xs text-muted">{t('earnings.noFx')}</p>
            </section>
          )}
          <Card className="p-4 text-sm">
            <p className="font-semibold">{t('earnings.formulaTitle')}</p>
            <p className="mt-1 font-mono text-xs text-muted">{t('earnings.formula')}</p>
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {(['reported', 'confirmed', 'approved', 'reversed', 'rejected'] as ConversionStatus[]).map((st) => (
                <li key={st} className="flex items-start gap-2"><CommissionStatus status={st} /><span>{t(`earnings.statusHelp.${st}` as TKey)}</span></li>
              ))}
            </ul>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/studio/payouts/request"><Banknote className="h-4 w-4" />{t('screens.payoutRequest')}</Link></Button>
            <Button asChild variant="secondary"><Link to="/studio/payouts">{t('screens.payoutHistory')}</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
type Filter = ConversionStatus | 'all';
export function TransactionsPage({ initial = 'all' }: { initial?: Filter }) {
  const { t, date, locale } = useI18n();
  const repo = useRepo();
  const [filter, setFilter] = useState<Filter>(initial);
  const q = useQuery({ queryKey: qk.conversions(filter), queryFn: () => repo.listConversions(filter) });
  const products = useProducts((q.data ?? []).map((c) => c.productId ?? '').filter(Boolean));
  const filters: Filter[] = ['all', 'reported', 'confirmed', 'approved', 'reversed', 'rejected'];
  return (
    <div>
      <PageHead title={t('screens.commissionTransactions')} desc={t('earnings.txDesc')} action={<SampleImportButton />} />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="toolbar" aria-label={t('earnings.filter')}>
        {filters.map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? t('categories.all') : t(`earnings.status.${f}` as TKey)}</Chip>)}
      </div>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<Wallet />} title={t('earnings.noTx')} description={t('earnings.noTxDesc')} />
      ) : (
        <ul className="space-y-2">
          {q.data.map((c) => {
            const p = products.data?.get(c.productId ?? '');
            return (
              <li key={c.id}>
                <Card className="flex gap-3 p-3">
                  <SmartImage src={p?.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-sm object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{p?.title ?? t('product.product')}</p>
                      <CommissionStatus status={c.status} />
                      {c.isSample && <SampleBadge />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{c.networkName} · #{c.providerEventId} · {date(c.occurredAt)}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                      <div><dt className="text-muted">{t('earnings.order')}</dt><dd><CurrencyDisplay amount={c.orderAmount} currency={c.currency} /></dd></div>
                      <div><dt className="text-muted">{t('earnings.commission')}</dt><dd><CurrencyDisplay amount={c.commissionAmount} currency={c.currency} /></dd></div>
                      <div><dt className="text-muted">{t('earnings.share')}</dt><dd>{c.creatorShareBps !== null ? (locale === 'tr' ? `%${c.creatorShareBps / 100}` : `${c.creatorShareBps / 100}%`) : '—'}</dd></div>
                      <div><dt className="text-muted">{t('earnings.yourShare')}</dt><dd className="font-semibold">{c.status === 'rejected' ? '—' : c.creatorAmount !== null ? <CurrencyDisplay amount={c.creatorAmount} currency={c.currency} /> : t('earnings.notYet')}</dd></div>
                    </dl>
                    {c.reversedAmount > 0 && <p className="mt-1 text-xs text-danger">{t('earnings.reversedNote')}: <CurrencyDisplay amount={c.reversedAmount} currency={c.currency} /></p>}
                    {c.rejectReason && <p className="mt-1 text-xs text-muted">{t('earnings.reason')}: {t(`earnings.reasons.${c.rejectReason}` as TKey)}</p>}
                    {c.status === 'confirmed' && c.holdUntil && <p className="mt-1 text-xs text-muted">{t('earnings.holdUntil', { date: date(c.holdUntil) })}</p>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AffiliateLinksPage() {
  const { t, date } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const links = useQuery({ queryKey: qk.links, queryFn: () => repo.listAffiliateLinks() });
  const markets = useMarketplaces();
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [offerId, setOfferId] = useState('');
  const found = useQuery({ queryKey: ['products', 'links', search], queryFn: () => repo.searchProducts(search), enabled: search.trim().length > 1 });
  const offers = useQuery({ queryKey: ['offers', productId], queryFn: () => repo.listOffers(productId), enabled: !!productId });
  const allOfferIds = (links.data ?? []).map((l) => l.offerId);
  const offerMap = useQuery({
    queryKey: ['offers', 'links', allOfferIds.join(',')],
    queryFn: async () => {
      const prods = await repo.searchProducts('');
      const all = (await Promise.all(prods.map((p) => repo.listOffers(p.id)))).flat();
      return new Map(all.map((o) => [o.id, { offer: o, product: prods.find((p) => p.id === o.productId)! }]));
    },
    enabled: allOfferIds.length > 0,
  });
  const create = useMutation({
    mutationFn: () => repo.createAffiliateLink(offerId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.links }); setOfferId(''); setProductId(''); setSearch(''); toast({ variant: 'success', title: t('links.created') }); },
    onError,
  });
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ variant: 'success', title: t('share.copied') }); } catch { toast({ variant: 'error', title: t('share.copyFailed'), description: text }); }
  };
  return (
    <div>
      <PageHead title={t('links.title')} desc={t('links.desc')} />
      <Card className="mb-6 space-y-3 p-4">
        <h2 className="text-sm font-semibold">{t('links.new')}</h2>
        <Field label={t('links.searchProduct')}>{(p) => <Input {...p} value={search} onChange={(e) => { setSearch(e.target.value); setProductId(''); setOfferId(''); }} placeholder={t('create.searchCatalog')} />}</Field>
        {found.data && !productId && (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {found.data.map((p) => (
              <li key={p.id}><button type="button" onClick={() => setProductId(p.id)} className="flex min-h-[44px] w-full items-center gap-3 rounded-sm px-2 text-start hover:bg-surface">
                <SmartImage src={p.images[0]} alt="" className="h-9 w-9 rounded-[8px] object-cover" /><span className="truncate text-sm"><span className="text-muted">{p.brandName}</span> {p.title}</span>
              </button></li>
            ))}
          </ul>
        )}
        {productId && (
          <Field label={t('links.offer')}>{(p) => (
            <Select {...p} value={offerId} onChange={(e) => setOfferId(e.currentTarget.value)}>
              <option value="">{t('links.pickOffer')}</option>
              {offers.data?.map((o) => <option key={o.id} value={o.id}>{markets.data?.get(o.marketplaceId)?.name} · {o.country} · {o.price} {o.currency}</option>)}
            </Select>
          )}</Field>
        )}
        <Button onClick={() => create.mutate()} disabled={!offerId} loading={create.isPending}><Plus className="h-4 w-4" />{t('links.create')}</Button>
      </Card>
      {links.isLoading ? <ListSkeleton /> : !links.data?.length ? <EmptyState icon={<Link2 />} title={t('links.empty')} description={t('links.emptyDesc')} /> : (
        <ul className="space-y-2">
          {links.data.map((l) => {
            const info = offerMap.data?.get(l.offerId);
            const url = `${location.origin}/product/${info?.product.id ?? ''}?ref=${l.code}`;
            return (
              <li key={l.id}><Card className="flex flex-wrap items-center gap-3 p-3">
                <SmartImage src={info?.product.images[0]} alt="" className="h-12 w-12 rounded-sm object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{info?.product.title ?? '…'}</p>
                  <p className="text-xs text-muted">{markets.data?.get(info?.offer.marketplaceId ?? '')?.name} · <span className="font-mono">{l.code}</span> · {date(l.createdAt)}</p>
                  <div className="mt-1">{l.trackingActive ? <Badge tone="success">{t('links.trackingOn')}</Badge> : <Badge tone="warning">{t('links.trackingOff')}</Badge>}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => copy(url)}><Copy className="h-4 w-4" />{t('share.copyLink')}</Button>
              </Card></li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex gap-2 text-xs text-muted"><Info className="h-4 w-4 shrink-0" />{t('links.trackingNote')}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function usePayoutAccount() {
  const repo = useRepo();
  return useQuery({ queryKey: qk.account, queryFn: () => repo.getPayoutAccount() });
}

export function PayoutOnboardingPage() {
  const { t } = useI18n();
  const acct = usePayoutAccount();
  const a = acct.data;
  const step = (icon: React.ReactNode, label: TKey, status: string) => (
    <li className="flex items-center gap-3 py-3">
      <span className="text-muted [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span className="flex-1 text-sm">{t(label)}</span>
      <Badge tone={status === 'verified' || status === 'accepted' ? 'success' : status === 'not_started' ? 'neutral' : status === 'failed' || status === 'rejected' ? 'danger' : 'warning'}>{t(`payouts.accountStatus.${status}` as TKey)}</Badge>
    </li>
  );
  return (
    <div className="max-w-xl">
      <PageHead title={t('screens.payoutOnboarding')} desc={t('payouts.setupDesc')} />
      {acct.isLoading ? <ListSkeleton rows={3} /> : a && (
        <Card className="p-4">
          <ul className="divide-y divide-line">
            {step(<Banknote />, 'payouts.provider', a.provider === 'unconfigured' ? 'not_started' : a.status)}
            {step(<IdCard />, 'payouts.kyc', a.kycStatus)}
            {step(<FileText />, 'payouts.taxForm', a.taxFormStatus)}
          </ul>
          <Button block className="mt-4" disabled><ShieldCheck className="h-4 w-4" />{t('payouts.startSetup')}</Button>
          <p className="mt-2 text-xs text-muted">{t('payouts.providerNotConfigured')}</p>
        </Card>
      )}
      <p className="mt-4 text-xs text-muted">{t('payouts.privacyNote')}</p>
    </div>
  );
}

export function PayoutRequestPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const summary = useQuery({ queryKey: qk.summary, queryFn: () => repo.getEarningsSummary() });
  const acct = usePayoutAccount();
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const curs = (summary.data?.byCurrency ?? []).filter((c) => c.approved > 0 || c.available > 0);
  const cur = curs.find((c) => c.currency === currency) ?? curs[0];
  const req = useMutation({
    mutationFn: () => repo.requestPayout(cur!.currency, Number(amount)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['earnings'] }); setAmount(''); toast({ variant: 'success', title: t('payouts.requested') }); },
    onError,
  });
  const eligible = summary.data?.payoutEligible;
  return (
    <div className="max-w-xl">
      <PageHead title={t('screens.payoutRequest')} desc={t('payouts.requestDesc')} />
      {summary.isLoading || acct.isLoading ? <ListSkeleton rows={3} /> : !eligible ? (
        <Card className="space-y-3 p-4">
          <p className="flex gap-2 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-warning" />{t('payouts.notEligible')}</p>
          {curs.length > 0 && <p className="text-xs text-muted">{t('payouts.approvedWaiting')}: {curs.map((c) => <CurrencyDisplay key={c.currency} amount={c.approved} currency={c.currency} className="me-2 font-semibold text-fg" />)}</p>}
          <Button asChild variant="secondary"><Link to="/studio/payouts/setup">{t('screens.payoutOnboarding')}</Link></Button>
        </Card>
      ) : !cur ? (
        <EmptyState icon={<Wallet />} title={t('payouts.nothingAvailable')} />
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); req.mutate(); }}>
          <Field label={t('settings.currency')}>{(p) => (
            <Select {...p} value={cur.currency} onChange={(e) => setCurrency(e.currentTarget.value)}>{curs.map((c) => <option key={c.currency} value={c.currency}>{c.currency}</option>)}</Select>
          )}</Field>
          <p className="text-sm">{t('earnings.availableNow')}: <CurrencyDisplay amount={cur.available} currency={cur.currency} className="font-semibold" /></p>
          <Field label={t('payouts.amount')}>{(p) => <Input {...p} type="number" inputMode="decimal" step="0.01" min="0.01" max={cur.available} value={amount} onChange={(e) => setAmount(e.target.value)} required />}</Field>
          <Button type="submit" block loading={req.isPending} disabled={!(Number(amount) > 0 && Number(amount) <= cur.available)}>{t('payouts.submit')}</Button>
          <p className="text-xs text-muted">{t('payouts.executionDisabled')}</p>
        </form>
      )}
    </div>
  );
}

export function PayoutHistoryPage() {
  const { t, date } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: qk.payouts, queryFn: () => repo.listPayouts() });
  return (
    <div className="max-w-2xl">
      <PageHead title={t('screens.payoutHistory')} action={<Button asChild size="sm"><Link to="/studio/payouts/request">{t('screens.payoutRequest')}</Link></Button>} />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<Banknote />} title={t('payouts.empty')} description={t('payouts.emptyDesc')} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((p) => (
            <li key={p.id}><Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <CurrencyDisplay amount={p.amount} currency={p.currency} className="text-lg font-bold" />
                <span className="text-xs text-muted">{date(p.requestedAt)}</span>
              </div>
              <PayoutTimeline payout={p} />
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function PostAnalyticsPage() {
  const { t, num, compact } = useI18n();
  const repo = useRepo();
  const { session } = useAuth();
  const q = useQuery({ queryKey: ['posts', 'author', session?.userId], queryFn: () => repo.listPostsByAuthor(session!.userId), enabled: !!session });
  const posts = q.data ?? [];
  const er = (p: Post) => (p.viewCount ? ((p.likeCount + p.commentCount + p.saveCount + p.shareCount) / p.viewCount) * 100 : 0);
  return (
    <div>
      <PageHead title={t('screens.postAnalytics')} desc={t('analytics.desc')} />
      {q.isLoading ? <ListSkeleton /> : !posts.length ? <EmptyState title={t('profile.noPosts')} action={<Button asChild><Link to="/create">{t('profile.createFirst')}</Link></Button>} /> : (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">{t('analytics.engagementRate')}</h2>
            <AnalyticsChart label={t('analytics.engagementRate')} data={posts.slice(0, 10).map((p) => ({ label: p.caption.slice(0, 32) || t('studio.untitled'), value: Math.round(er(p) * 10) / 10 }))} format={(n) => `${n}%`} />
          </Card>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-xs text-muted"><tr>
                <th className="p-3 text-start font-medium">{t('post.title')}</th>
                <th className="p-3 text-end font-medium"><Eye className="inline h-4 w-4" /> {t('studio.views')}</th>
                <th className="p-3 text-end font-medium"><Heart className="inline h-4 w-4" /> {t('studio.likes')}</th>
                <th className="p-3 text-end font-medium">{t('studio.comments')}</th>
                <th className="p-3 text-end font-medium">{t('studio.saves')}</th>
                <th className="p-3 text-end font-medium">{t('studio.shares')}</th>
                <th className="p-3 text-end font-medium">{t('analytics.er')}</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[220px] truncate p-3"><Link to={`/p/${p.id}`} className="font-medium hover:underline">{p.caption || t('studio.untitled')}</Link></td>
                    <td className="p-3 text-end tabular-nums">{compact(p.viewCount)}</td>
                    <td className="p-3 text-end tabular-nums">{num(p.likeCount)}</td>
                    <td className="p-3 text-end tabular-nums">{num(p.commentCount)}</td>
                    <td className="p-3 text-end tabular-nums">{num(p.saveCount)}</td>
                    <td className="p-3 text-end tabular-nums">{num(p.shareCount)}</td>
                    <td className="p-3 text-end tabular-nums">{er(p).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">{t('analytics.reachNote')}</p>
        </div>
      )}
    </div>
  );
}

export function ProductPerformancePage() {
  const { t, num } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: qk.stats, queryFn: () => repo.getClickStats() });
  const products = useProducts((q.data ?? []).map((s) => s.productId));
  return (
    <div>
      <PageHead title={t('screens.productPerformance')} desc={t('analytics.productDesc')} action={<SampleImportButton />} />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
        <EmptyState icon={<MousePointerClick />} title={t('analytics.noClicks')} description={t('analytics.noClicksDesc')} />
      ) : (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">{t('earnings.outboundClicks')}</h2>
            <AnalyticsChart label={t('earnings.outboundClicks')} data={q.data.slice(0, 8).map((s) => ({ label: products.data?.get(s.productId)?.title ?? '…', value: s.clicks }))} format={(n) => num(n)} />
          </Card>
          <ul className="space-y-2">
            {q.data.map((s) => {
              const p = products.data?.get(s.productId);
              return (
                <li key={s.productId}><Card className="flex flex-wrap items-center gap-3 p-3">
                  <SmartImage src={p?.images[0]} alt="" className="h-12 w-12 rounded-sm object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p?.title ?? '…'}</p><p className="text-xs text-muted">{p?.brandName}</p></div>
                  <dl className="grid grid-cols-3 gap-4 text-end text-xs">
                    <div><dt className="text-muted">{t('analytics.clicks')}</dt><dd className="text-sm font-semibold">{num(s.clicks)}</dd></div>
                    <div><dt className="text-muted">{t('earnings.confirmed')}</dt><dd className="text-sm font-semibold">{num(s.confirmedConversions)}</dd></div>
                    <div><dt className="text-muted">{t('earnings.yourShare')}</dt><dd className="text-sm font-semibold">{s.creatorEarned.length ? s.creatorEarned.map((e) => <CurrencyDisplay key={e.currency} amount={e.amount} currency={e.currency} showCode={false} className="block" />) : '—'}</dd></div>
                  </dl>
                </Card></li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">{t('earnings.clicksHint')}</p>
        </div>
      )}
    </div>
  );
}
