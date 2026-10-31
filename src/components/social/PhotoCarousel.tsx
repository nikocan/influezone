import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Media } from '@/data/types';
import { SmartImage } from '@/components/common/SmartImage';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export function PhotoCarousel({ media, renderOverlay, onIndexChange, onDoubleTap, className }: {
  media: Media[]; renderOverlay?: (m: Media, i: number) => React.ReactNode; onIndexChange?: (i: number) => void; onDoubleTap?: () => void; className?: string;
}) {
  const { t } = useI18n();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const lastTap = useRef(0);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(media.length - 1, i));
    const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: dir * next * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== index) { setIndex(i); onIndexChange?.(i); }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) onDoubleTap?.();
    lastTap.current = now;
  };
  return (
    <div className={cn('group relative h-full w-full', className)} role="region" aria-roledescription="carousel" aria-label={t('post.media')} onKeyDown={onKey}>
      <div ref={track} onScroll={onScroll} onClick={tap} className="scrollbar-none flex h-full w-full snap-x snap-mandatory overflow-x-auto" tabIndex={0}>
        {media.map((m, i) => (
          <div key={m.id} className="relative h-full w-full shrink-0 snap-center" role="group" aria-roledescription="slide" aria-label={t('post.slideOf', { i: i + 1, n: media.length })}>
            <SmartImage src={m.url} alt={m.alt} fallbackLabel={m.alt} className="h-full w-full object-cover" draggable={false} />
            {renderOverlay?.(m, i)}
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="absolute start-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow disabled:hidden md:flex md:opacity-0 md:group-hover:opacity-100" aria-label={t('common.previous')}>
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === media.length - 1} className="absolute end-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow disabled:hidden md:flex md:opacity-0 md:group-hover:opacity-100" aria-label={t('common.next')}>
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
          <span className="absolute end-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">{index + 1}/{media.length}</span>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1" aria-hidden>
            {media.map((m, i) => <span key={m.id} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />)}
          </div>
        </>
      )}
    </div>
  );
}
