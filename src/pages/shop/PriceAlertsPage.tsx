import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { qk, useErrorToast, useProducts } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { SmartImage } from '@/components/common/SmartImage';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { Button } from '@/components/ui/button';

export function PriceAlertsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const alerts = useQuery({ queryKey: qk.priceAlerts, queryFn: () => repo.listPriceAlerts() });
  const products = useProducts((alerts.data ?? []).map((a) => a.productId));
  const del = useMutation({ mutationFn: (id: string) => repo.deletePriceAlert(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.priceAlerts }), onError });
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('alerts.title')} />
      <p className="px-4 pt-3 text-xs text-muted">{t('alerts.deliveryNote')}</p>
      <div className="p-4">
        {alerts.isLoading ? <ListSkeleton /> : alerts.isError ? <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} /> : !alerts.data?.length ? (
          <EmptyState icon={<BellRing />} title={t('alerts.empty')} description={t('alerts.emptyDesc')} />
        ) : (
          <ul className="divide-y divide-line">
            {alerts.data.map((a) => {
              const p = products.data?.get(a.productId);
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <Link to={`/product/${a.productId}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <SmartImage src={p?.images[0]} alt="" className="h-14 w-14 rounded-sm object-cover" />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p?.title ?? '…'}</span><span className="text-xs text-muted">{t('alerts.below')} <CurrencyDisplay amount={a.targetPrice} currency={a.currency} /></span></span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)} aria-label={t('common.delete')}><Trash2 className="h-5 w-5" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
