import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/data/types';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export function ProductTag({ left, top, product, expanded, onClick, className }: { left: number; top: number; product?: Product; expanded: boolean; onClick: () => void; className?: string }) {
  const { t } = useI18n();
  const name = product ? `${product.brandName} ${product.title}` : t('product.product');
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ left, top }}
      className={cn('pointer-events-auto absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center', className)}
      aria-label={t('product.viewProduct', { name })}
    >
      {expanded ? (
        <span className="flex max-w-[180px] items-center gap-1.5 rounded-full bg-white/95 py-1 pe-3 ps-1 text-xs font-semibold text-[#111] shadow-lg animate-fade-in">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"><ShoppingBag className="h-3.5 w-3.5" aria-hidden /></span>
          <span className="truncate">{product?.title ?? '…'}</span>
        </span>
      ) : (
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/60 motion-reduce:animate-none" />
          <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow" />
        </span>
      )}
    </button>
  );
}
