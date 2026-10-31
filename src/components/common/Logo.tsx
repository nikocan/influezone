import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#7047EB" />
      <path d="M42 22c-2-3-6-5-10-5-6 0-10 3-10 8 0 11 20 7 20 16 0 4-4 7-10 7-4 0-8-2-11-5" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="46" r="4" fill="#D4AF37" />
    </svg>
  );
}

export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} aria-label="Shopfluence">
      <LogoMark className="h-full w-auto" />
      {wordmark && <span className="text-lg font-extrabold tracking-tight" aria-hidden>shop<span className="text-primary">fluence</span></span>}
    </span>
  );
}
