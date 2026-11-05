import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import type { ConversionStatus, CurrencyEarnings, Payout } from '@/data/types';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { Badge, Card } from '@/components/ui/misc';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { cn } from '@/lib/utils';

const TONE: Record<ConversionStatus, 'neutral' | 'warning' | 'primary' | 'success' | 'danger'> = {
  reported: 'neutral', confirmed: 'warning', approved: 'success', reversed: 'danger', rejected: 'danger',
};

/** Badge for a conversion's commission status (reported = estimate only). */
export function CommissionStatus({ status }: { status: ConversionStatus }) {
  const { t } = useI18n();
  return <Badge tone={TONE[status]}>{t(`earnings.status.${status}` as TKey)}</Badge>;
}

/** Per-currency earnings summary. Currencies are shown side by side, never combined. */
export function EarningsSummary({ e }: { e: CurrencyEarnings }) {
  const { t } = useI18n();
  const row = (k: TKey, amount: number, tone?: string, hint?: TKey) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-sm">{t(k)}</p>{hint && <p className="text-[11px] text-muted">{t(hint)}</p>}</div>
      <CurrencyDisplay amount={amount} currency={e.currency} className={cn('shrink-0 text-sm font-semibold', tone)} />
    </div>
  );
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{e.currency}</p>
        <p className="text-xs text-muted">{t('earnings.availableNow')}</p>
      </div>
      <div className="flex items-baseline justify-between">
        <span />
        <CurrencyDisplay amount={e.available} currency={e.currency} className="text-2xl font-bold" />
      </div>
      <div className="mt-3 divide-y divide-line border-t border-line">
        {e.estimated > 0 && row('earnings.buckets.estimated', e.estimated, 'text-muted', 'earnings.buckets.estimatedHint')}
        {row('earnings.buckets.pending', e.pending, 'text-warning', 'earnings.buckets.pendingHint')}
        {row('earnings.buckets.approved', e.approved, 'text-success', 'earnings.buckets.approvedHint')}
        {e.inPayout > 0 && row('earnings.buckets.inPayout', e.inPayout)}
        {row('earnings.buckets.paid', e.paid)}
        {e.reversed > 0 && row('earnings.buckets.reversed', -e.reversed, 'text-danger', 'earnings.buckets.reversedHint')}
      </div>
    </Card>
  );
}

export function CreatorAnalyticsCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </Card>
  );
}

const STEPS: Payout['status'][] = ['requested', 'approved', 'processing', 'paid'];

export function PayoutTimeline({ payout }: { payout: Payout }) {
  const { t, date } = useI18n();
  const failed = payout.status === 'rejected' || payout.status === 'failed' || payout.status === 'cancelled';
  const reached = (s: Payout['status']) => payout.events.some((e) => e.status === s) || STEPS.indexOf(payout.status) >= STEPS.indexOf(s);
  return (
    <ol className="mt-3 space-y-2" aria-label={t('payouts.timeline')}>
      {STEPS.map((s) => {
        const ev = payout.events.find((e) => e.status === s);
        const done = !failed && reached(s);
        return (
          <li key={s} className="flex items-center gap-2 text-sm">
            {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : s === 'requested' && failed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-line" />}
            <span className={cn(!done && !(s === 'requested' && failed) && 'text-muted')}>{t(`payouts.status.${s}` as TKey)}</span>
            {ev && <span className="text-xs text-muted">· {date(ev.at, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
          </li>
        );
      })}
      {failed && <li className="flex items-center gap-2 text-sm text-danger"><XCircle className="h-4 w-4" />{t(`payouts.status.${payout.status}` as TKey)}</li>}
      {payout.status === 'approved' && <li className="flex items-center gap-2 text-xs text-muted"><Clock className="h-4 w-4" />{t('payouts.executionDisabled')}</li>}
    </ol>
  );
}

/** Minimal accessible bar chart (SVG) — values are labelled, no decorative axes. */
export function AnalyticsChart({ data, label, format }: { data: { label: string; value: number }[]; label: string; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure aria-label={label}>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-muted" title={d.label}>{d.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
            </span>
            <span className="tabular-nums font-semibold">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
