import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/** Image with lazy loading, reserved aspect ratio (no layout shift) and an accessible fallback. */
export function SmartImage({ src, alt, className, fallbackLabel, ...p }: ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string }) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  // a src that arrives after first render (async data) must get a fresh attempt
  useEffect(() => { setFailed(!src); setLoaded(false); }, [src]);
  if (failed) {
    const h = hue(String(src ?? alt ?? ''));
    return (
      <div role="img" aria-label={alt} className={cn('flex flex-col items-center justify-center gap-2 p-3 text-center text-white/90', className)}
        style={{ background: `linear-gradient(135deg, hsl(${h} 45% 42%), hsl(${(h + 40) % 360} 50% 28%))` }}>
        <ImageOff className="h-6 w-6 opacity-70" aria-hidden />
        {fallbackLabel && <span className="line-clamp-2 text-xs font-medium">{fallbackLabel}</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={cn('bg-surface transition-opacity duration-200', loaded ? 'opacity-100' : 'opacity-0', className)}
      {...p}
    />
  );
}
