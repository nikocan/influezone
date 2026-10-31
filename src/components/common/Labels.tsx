import { FlaskConical, Info, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/misc';
import { useI18n } from '@/i18n/I18nProvider';
import type { Disclosure } from '@/data/types';
import { cn } from '@/lib/utils';

export function SampleBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return <Badge tone="warning" className={className} title={t('demo.sampleTooltip')}><FlaskConical className="h-3 w-3" aria-hidden />{t('demo.sample')}</Badge>;
}

export function DisclosureLabel({ disclosure, className, onDark }: { disclosure: Disclosure; className?: string; onDark?: boolean }) {
  const { t } = useI18n();
  if (disclosure === 'none') return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', onDark ? 'bg-black/45 text-white backdrop-blur' : 'bg-surface text-fg border border-line', className)}>
      <Info className="h-3 w-3" aria-hidden />
      {t(`disclosure.${disclosure}`)}
    </span>
  );
}

export function ModerationNotice({ title, description }: { title: string; description?: string }) {
  return (
    <div role="note" className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <ShieldAlert className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      <div><p className="font-semibold">{title}</p>{description && <p className="text-muted">{description}</p>}</div>
    </div>
  );
}
