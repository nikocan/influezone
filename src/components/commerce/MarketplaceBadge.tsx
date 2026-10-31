import type { Marketplace } from '@/data/types';
import { SampleBadge } from '@/components/common/Labels';
import { cn } from '@/lib/utils';

export function MarketplaceBadge({ marketplace, className, showSample = true }: { marketplace?: Marketplace; className?: string; showSample?: boolean }) {
  if (!marketplace) return <span className={cn('text-sm text-muted', className)}>…</span>;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-xs font-extrabold text-white" style={{ background: marketplace.color }} aria-hidden>
        {marketplace.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
      </span>
      <span className="truncate text-sm font-semibold">{marketplace.name}</span>
      {showSample && marketplace.isSample && <SampleBadge />}
    </span>
  );
}
