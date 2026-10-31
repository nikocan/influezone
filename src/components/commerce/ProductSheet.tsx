import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronRight, PackageX } from 'lucide-react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/common/SmartImage';
import { SampleBadge } from '@/components/common/Labels';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { useI18n } from '@/i18n/I18nProvider';
import { useRequireAuth } from '@/data/hooks';
import { useMarketplaces, useOffers, useProduct } from './useCommerce';
import { OfferComparisonCard } from './OfferComparisonCard';
import { OutboundDialog } from './OutboundDialog';
import { getCountry } from '@/i18n/locales';
import type { Offer } from '@/data/types';
import { SaveToCollectionSheet } from '@/components/social/Sheets';

/** Product quick view bottom sheet opened from tags and product rails. */
export function ProductSheet({ productId, postId, creatorId, onOpenChange }: { productId: string; postId: string | null; creatorId: string | null; onOpenChange: (o: boolean) => void }) {
  const { t, locale } = useI18n();
  const product = useProduct(productId);
  const offers = useOffers(productId);
  const markets = useMarketplaces();
  const guard = useRequireAuth();
  const [buying, setBuying] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const p = product.data;
  const country = getCountry(offers.country);
  return (
    <>
      <Modal open={!buying && !saving} onOpenChange={onOpenChange} title={t('product.quickView')} hideTitle>
        {product.isLoading ? <ListSkeleton rows={3} /> : product.isError ? <ErrorState error={product.error} onRetry={() => product.refetch()} /> : !p ? (
          <EmptyState icon={<PackageX />} title={t('product.unavailable')} />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <SmartImage src={p.images[0]} alt={p.title} fallbackLabel={p.title} className="h-28 w-28 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{p.brandName}</p>
                <h2 className="text-lg font-bold leading-tight">{p.title}</h2>
                {p.variant && <p className="text-sm text-muted">{p.variant}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">{p.isSample && <SampleBadge />}</div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('offers.inCountry', { country: `${country.flag} ${locale === 'tr' ? country.names.tr : country.names.en}` })}</p>
              {offers.isLoading ? <ListSkeleton rows={2} /> : offers.local.length === 0 ? (
                <p className="rounded-md bg-surface p-3 text-sm text-muted">{t('offers.noneInCountry')}</p>
              ) : (
                <div className="space-y-2">
                  {offers.local.slice(0, 2).map((o) => (
                    <OfferComparisonCard key={o.id} offer={o} marketplace={markets.data?.get(o.marketplaceId)} isBest={o.id === offers.bestId} onBuy={() => setBuying(o)} compact />
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={guard(() => setSaving(true))}><Bookmark className="h-4 w-4" />{t('social.save')}</Button>
              <Button asChild variant="outline" onClick={() => onOpenChange(false)}>
                <Link to={`/product/${p.id}${postId ? `?from=${postId}` : ''}`}>{t('offers.compareAll', { n: offers.local.length })}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Link>
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {buying && p && <OutboundDialog offer={buying} product={p} marketplace={markets.data?.get(buying.marketplaceId)} postId={postId} creatorId={creatorId} onOpenChange={(o) => { if (!o) setBuying(null); }} />}
      {saving && <SaveToCollectionSheet itemKind="product" refId={productId} onOpenChange={(o) => { if (!o) setSaving(false); }} />}
    </>
  );
}
