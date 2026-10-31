import { Clock, Truck, AlertTriangle, ExternalLink, BadgeCheck, CircleOff } from 'lucide-react';
import type { Marketplace, Offer } from '@/data/types';
import { useI18n } from '@/i18n/I18nProvider';
import { priceFreshness, isEstimated } from '@/lib/commerce';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { MarketplaceBadge } from './MarketplaceBadge';
import { cn } from '@/lib/utils';

export function OfferComparisonCard({ offer, marketplace, isBest, onBuy, compact }: { offer: Offer; marketplace?: Marketplace; isBest: boolean; onBuy: () => void; compact?: boolean }) {
  const { t, relative } = useI18n();
  const fresh = priceFreshness(offer);
  const estimated = isEstimated(offer);
  const out = offer.availability === 'out_of_stock';
  return (
    <div className={cn('rounded-md border bg-bg p-3', isBest ? 'border-success ring-1 ring-success/30' : 'border-line', out && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <MarketplaceBadge marketplace={marketplace} />
        {isBest && <Badge tone="success"><BadgeCheck className="h-3 w-3" aria-hidden />{t('offers.bestPrice')}</Badge>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xl font-bold', estimated && 'text-muted')}>
            {estimated && <span className="me-1 text-sm font-medium">≈</span>}
            <CurrencyDisplay amount={offer.price} currency={offer.currency} />
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            {offer.shippingCost === null ? t('offers.shippingUnknown') : offer.shippingCost === 0 ? t('offers.freeShipping') : <>{t('offers.shipping')}: <CurrencyDisplay amount={offer.shippingCost} currency={offer.currency} showCode={false} /></>}
          </p>
        </div>
        <Button size="sm" onClick={onBuy} disabled={out} aria-label={t('offers.buyAt', { store: marketplace?.name ?? '' })}>
          {out ? <CircleOff className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          {out ? t('offers.outOfStock') : t('offers.goToStore')}
        </Button>
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn('inline-flex items-center gap-1', fresh === 'stale' ? 'text-danger' : fresh === 'aging' ? 'text-warning' : 'text-muted')}>
            <Clock className="h-3 w-3" aria-hidden />{t('offers.updated', { when: relative(offer.lastUpdated) })}
          </span>
          {fresh === 'stale' && <Badge tone="danger"><AlertTriangle className="h-3 w-3" aria-hidden />{t('offers.stale')}</Badge>}
          {estimated && <Badge tone="warning">{t('offers.estimated')}</Badge>}
          {offer.availability === 'unknown' && <Badge tone="neutral">{t('offers.availabilityUnknown')}</Badge>}
          {offer.affiliateEligible && <Badge tone="outline">{t('offers.affiliate')}</Badge>}
        </div>
      )}
    </div>
  );
}
