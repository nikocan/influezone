import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BellRing, PackageX, Globe2, ArrowLeft, Info } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { qk, useErrorToast, useRequireAuth } from '@/data/hooks';
import { useMarketplaces, useOffers, useProduct } from '@/components/commerce/useCommerce';
import { OfferComparisonCard } from '@/components/commerce/OfferComparisonCard';
import { OutboundDialog } from '@/components/commerce/OutboundDialog';
import { ProductCard } from '@/components/commerce/ProductCard';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { SmartImage } from '@/components/common/SmartImage';
import { SampleBadge } from '@/components/common/Labels';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { PostGridTile } from '@/components/social/PostCard';
import { useSheets } from '@/components/social/Sheets';
import { Button } from '@/components/ui/button';
import { Segmented, SectionTitle, Badge } from '@/components/ui/misc';
import { Modal } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { getCountry } from '@/i18n/locales';
import type { Offer } from '@/data/types';
import type { OfferSort } from '@/lib/commerce';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const fromPost = params.get('from');
  const { t, locale } = useI18n();
  const repo = useRepo();
  const sheets = useSheets();
  const guard = useRequireAuth();
  const product = useProduct(id);
  const [sort, setSort] = useState<OfferSort>('price');
  const offers = useOffers(id, sort);
  const markets = useMarketplaces();
  const creatorPosts = useQuery({ queryKey: ['posts', 'product', id], queryFn: () => repo.listPostsByProduct(id) });
  const similar = useQuery({ queryKey: ['products', 'similar', id], queryFn: () => repo.listSimilarProducts(id) });
  const [buying, setBuying] = useState<Offer | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const fromPostData = creatorPosts.data?.find((p) => p.id === fromPost);
  const country = getCountry(offers.country);
  const p = product.data;

  if (product.isLoading) return <><TopNavigation title={t('product.product')} /><div className="p-4"><ListSkeleton rows={4} /></div></>;
  if (product.isError) return <><TopNavigation title={t('product.product')} /><ErrorState error={product.error} onRetry={() => product.refetch()} /></>;
  if (!p) return <><TopNavigation title={t('product.product')} /><EmptyState icon={<PackageX />} title={t('product.unavailable')} description={t('product.unavailableDesc')} /></>;

  return (
    <div className="mx-auto max-w-[1000px] pb-8">
      <TopNavigation title={p.title} />
      {fromPost && (
        <Link to={`/p/${fromPost}`} className="mx-4 mt-3 flex items-center gap-2 rounded-sm bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t('product.backToPost')}
        </Link>
      )}
      <div className="grid gap-6 p-4 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
            <SmartImage src={p.images[0]} alt={p.title} fallbackLabel={p.title} className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted">{p.brandName}</p>
            <h1 className="text-2xl font-bold leading-tight">{p.title}</h1>
            {p.variant && <p className="mt-1 text-sm text-muted">{t('product.variant')}: {p.variant}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{t(`categories.${p.category}` as TKey)}</Badge>
              {p.gtin && <Badge tone="outline">GTIN {p.gtin}</Badge>}
              {p.isSample && <SampleBadge />}
            </div>
          </div>
          {p.description && <p className="text-sm leading-relaxed text-fg/90">{p.description}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted"><Globe2 className="h-3.5 w-3.5" />{t('product.availableIn')}: {p.countries.map((c) => getCountry(c).flag).join(' ') || '—'}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={guard(() => sheets.openSave('product', p.id))}><Bookmark className="h-4 w-4" />{t('social.save')}</Button>
            <Button variant="secondary" onClick={guard(() => setAlertOpen(true))}><BellRing className="h-4 w-4" />{t('alerts.create')}</Button>
          </div>
        </div>
      </div>

      <section id="offers" className="px-4">
        <SectionTitle action={<Segmented label={t('offers.sort')} value={sort} onChange={setSort} size="sm" options={[{ value: 'price', label: t('offers.sortPrice') }, { value: 'updated', label: t('offers.sortUpdated') }]} />}>
          {t('offers.title')}
        </SectionTitle>
        <p className="mb-3 text-xs text-muted">{t('offers.inCountry', { country: `${country.flag} ${locale === 'tr' ? country.names.tr : country.names.en}` })} · <Link to="/settings/preferences" className="font-semibold text-primary">{t('offers.changeCountry')}</Link></p>
        {offers.isLoading ? <ListSkeleton rows={3} /> : offers.isError ? <ErrorState error={offers.error} onRetry={() => offers.refetch()} /> : offers.local.length === 0 ? (
          <EmptyState title={t('offers.noneInCountry')} description={offers.elsewhere.length ? t('offers.availableElsewhere', { n: offers.elsewhere.length }) : undefined} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {offers.local.map((o) => <OfferComparisonCard key={o.id} offer={o} marketplace={markets.data?.get(o.marketplaceId)} isBest={o.id === offers.bestId} onBuy={() => setBuying(o)} />)}
          </div>
        )}
        <p className="mt-3 flex gap-2 text-xs text-muted"><Info className="h-4 w-4 shrink-0" aria-hidden />{offers.bestId ? t('offers.bestPriceRule') : t('offers.noBestPrice')}</p>
        {offers.elsewhere.length > 0 && offers.local.length > 0 && (
          <details className="mt-3 rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">{t('offers.otherCountries', { n: offers.elsewhere.length })}</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {offers.elsewhere.map((o) => (
                <li key={o.id} className="flex justify-between gap-2"><span>{getCountry(o.country).flag} {markets.data?.get(o.marketplaceId)?.name}</span><CurrencyDisplay amount={o.price} currency={o.currency} /></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{t('offers.noConversion')}</p>
          </details>
        )}
      </section>

      <section id="creators" className="mt-8 px-4">
        <SectionTitle>{t('product.creatorContent')}</SectionTitle>
        {!creatorPosts.data?.length ? <p className="text-sm text-muted">{t('product.noCreatorContent')}</p> : (
          <div className="grid grid-cols-3 gap-0.5 md:grid-cols-6">{(fromPostData ? [fromPostData, ...creatorPosts.data.filter((x) => x.id !== fromPost)] : creatorPosts.data).map((x) => <PostGridTile key={x.id} post={x} />)}</div>
        )}
      </section>

      <section className="mt-8 px-4">
        <SectionTitle>{t('product.reviews')}</SectionTitle>
        <p className="rounded-md bg-surface p-3 text-sm text-muted">{t('product.reviewsUnavailable')}</p>
      </section>

      {(similar.data?.length ?? 0) > 0 && (
        <section id="similar" className="mt-8 px-4">
          <SectionTitle>{t('product.similar')}</SectionTitle>
          <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">{similar.data!.map((x) => <li key={x.id} className="w-36 shrink-0"><ProductCard product={x} /></li>)}</ul>
        </section>
      )}

      {buying && <OutboundDialog offer={buying} product={p} marketplace={markets.data?.get(buying.marketplaceId)} postId={fromPost} creatorId={fromPostData?.authorId ?? null} onOpenChange={(o) => { if (!o) setBuying(null); }} />}
      {alertOpen && <PriceAlertDialog productId={p.id} defaultCurrency={offers.local[0]?.currency ?? country.currency} currentLow={offers.local[0]?.price} onOpenChange={setAlertOpen} />}
    </div>
  );
}

function PriceAlertDialog({ productId, defaultCurrency, currentLow, onOpenChange }: { productId: string; defaultCurrency: string; currentLow?: number; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [price, setPrice] = useState(currentLow ? String(Math.floor(currentLow * 0.9)) : '');
  const save = useMutation({
    mutationFn: () => repo.createPriceAlert(productId, Number(price), defaultCurrency),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.priceAlerts }); toast({ variant: 'success', title: t('alerts.created') }); onOpenChange(false); },
    onError,
  });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('alerts.create')} description={t('alerts.desc')}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label={t('alerts.target', { currency: defaultCurrency })} hint={t('alerts.hint')}>{(p) => <Input {...p} type="number" inputMode="decimal" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />}</Field>
        <Button type="submit" block loading={save.isPending} disabled={!(Number(price) > 0)}>{t('alerts.save')}</Button>
      </form>
    </Modal>
  );
}
