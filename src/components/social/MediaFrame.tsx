import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Media, ProductTagPlacement, Product } from '@/data/types';
import { toRendered } from '@/lib/tagging';
import { ProductTag } from './ProductTag';

/** Positions normalized product tags over media rendered with object-fit: cover. */
export function TagOverlay({ media, tags, products, visible, onTagClick }: { media: Media; tags: ProductTagPlacement[]; products?: Map<string, Product>; visible: boolean; onTagClick: (productId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ width: e!.contentRect.width, height: e!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {box && tags.map((tag) => {
        const pos = toRendered(tag.x, tag.y, box, { width: media.width, height: media.height }, 'cover');
        if (!pos.visible) return null;
        return (
          <ProductTag key={tag.id} left={pos.left} top={pos.top} product={products?.get(tag.productId)} expanded={visible} onClick={() => onTagClick(tag.productId)} />
        );
      })}
    </div>
  );
}

export function AspectBox({ ratio, children, className }: { ratio: number; children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ position: 'relative', width: '100%', aspectRatio: String(ratio) }}>
      {children}
    </div>
  );
}
