import { Link } from 'react-router-dom';
import type { Product } from '@/data/types';
import { SmartImage } from '@/components/common/SmartImage';
import { SampleBadge } from '@/components/common/Labels';
import { cn } from '@/lib/utils';

export function ProductCard({ product, className, onClick }: { product: Product; className?: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-sm bg-surface">
        <SmartImage src={product.images[0]} alt={product.title} fallbackLabel={product.title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        {product.isSample && <SampleBadge className="absolute start-2 top-2 border-0 bg-warning text-black dark:text-black" />}
      </div>
      <p className="mt-2 truncate text-xs text-muted">{product.brandName}</p>
      <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</p>
      {product.variant && <p className="truncate text-xs text-muted">{product.variant}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('group block w-full text-start', className)}>{inner}</button>
  ) : (
    <Link to={`/product/${product.id}`} className={cn('group block', className)}>{inner}</Link>
  );
}
