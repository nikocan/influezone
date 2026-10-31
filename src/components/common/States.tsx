import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useI18n } from '@/i18n/I18nProvider';
import { errorCode } from '@/data/errors';
import { cn } from '@/lib/utils';

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:h-6 [&>svg]:w-6">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  const code = offline ? 'network' : errorCode(error);
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        {code === 'network' ? <WifiOff className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold">{t('errors.title')}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{t(`errors.${code}` as 'errors.unknown')}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-3 px-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div>
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-none md:rounded-md" />
          <div className="space-y-2 px-4"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-24" /></div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-0.5" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-none" />)}
    </div>
  );
}
