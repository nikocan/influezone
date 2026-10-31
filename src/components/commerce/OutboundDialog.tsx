import { useState } from 'react';
import { ExternalLink, Info, PlugZap } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import type { Marketplace, Offer, Product } from '@/data/types';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { useErrorToast } from '@/data/hooks';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { MarketplaceBadge } from './MarketplaceBadge';

/**
 * Outbound purchase confirmation. Logs a click event (never a sale) and only redirects to a
 * merchant/affiliate URL returned by the server for an authorized configuration.
 */
export function OutboundDialog({ offer, product, marketplace, postId, creatorId, onOpenChange }: { offer: Offer; product: Product; marketplace?: Marketplace; postId: string | null; creatorId: string | null; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const onError = useErrorToast();
  // offers without an authorized merchant/affiliate URL cannot be purchased through Shopfluence yet
  const [notConfigured, setNotConfigured] = useState(offer.url === null);
  const go = useMutation({
    mutationFn: () => repo.recordOutboundClick(offer.id, postId, creatorId),
    onSuccess: ({ destination }) => {
      if (!destination) { setNotConfigured(true); return; }
      window.open(destination, '_blank', 'noopener,noreferrer');
      onOpenChange(false);
    },
    onError,
  });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('outbound.title')} description={t('outbound.desc', { store: marketplace?.name ?? '' })}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.brandName} {product.title}</p>
            {product.variant && <p className="text-xs text-muted">{product.variant}</p>}
            <MarketplaceBadge marketplace={marketplace} className="mt-2" />
          </div>
          <p className="shrink-0 text-lg font-bold"><CurrencyDisplay amount={offer.price} currency={offer.currency} /></p>
        </div>
        <div className="flex gap-2 rounded-md border border-line p-3 text-xs text-muted">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          <p>{offer.affiliateEligible ? t('outbound.affiliateDisclosure') : t('outbound.noAffiliate')} {t('outbound.priceMayChange')}</p>
        </div>
        {notConfigured ? (
          <div role="status" className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <PlugZap className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div>
              <p className="font-semibold">{t('outbound.notConfiguredTitle')}</p>
              <p className="text-muted">{t('outbound.notConfiguredBody')}</p>
            </div>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={() => go.mutate()} loading={go.isPending} disabled={notConfigured}>
            <ExternalLink className="h-4 w-4" />{t('outbound.continue')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
