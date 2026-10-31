import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

/** Sticky page header with back button, title and optional actions. */
export function TopNavigation({ title, back = true, actions, className, children, onBack }: { title?: ReactNode; back?: boolean; actions?: ReactNode; className?: string; children?: ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <header className={cn('sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur', className)}>
      <div className="flex h-14 items-center gap-2 px-2 md:px-4">
        {back && (
          <button onClick={() => (onBack ? onBack() : window.history.length > 1 ? nav(-1) : nav('/'))} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface" aria-label={t('common.back')}>
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
        )}
        <h1 className={cn('min-w-0 flex-1 truncate text-base font-bold', !back && 'px-2')}>{title}</h1>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
