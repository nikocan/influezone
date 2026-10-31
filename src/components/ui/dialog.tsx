import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** bottom sheet on mobile, centered dialog on desktop */
  variant?: 'sheet' | 'dialog' | 'fullscreen';
  className?: string;
  hideTitle?: boolean;
  footer?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children, variant = 'sheet', className, hideTitle, footer }: Props) {
  const { t } = useI18n();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
        <D.Content
          className={cn(
            'fixed z-50 flex flex-col bg-elevated text-fg shadow-2xl focus:outline-none',
            variant === 'sheet' && 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-lg animate-sheet-in md:inset-auto md:left-1/2 md:top-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:animate-fade-in',
            variant === 'dialog' && 'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg animate-fade-in',
            variant === 'fullscreen' && 'inset-0 md:inset-8 md:rounded-lg animate-fade-in',
            className,
          )}
        >
          {variant === 'sheet' && <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" aria-hidden />}
          <div className={cn('flex items-start justify-between gap-4 px-5 pt-4', hideTitle && 'sr-only')}>
            <div className="min-w-0">
              <D.Title className="text-base font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-fg" aria-label={t('common.close')}>
              <X className="h-5 w-5" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">{children}</div>
          {footer && <div className="border-t border-line px-5 py-3 pb-safe">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
