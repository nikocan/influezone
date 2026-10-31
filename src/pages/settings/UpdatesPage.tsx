import { useState } from 'react';
import { CheckCircle2, Clock, CircleDashed, Sparkles } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { CHANGELOG } from '@/config/changelog';
import { SCREENS, type Shell } from '@/config/routes';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { Badge, Segmented, Card } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

/** In-app changelog + live implementation status of every screen in the inventory. */
export function UpdatesPage() {
  const { t, locale, date } = useI18n();
  const [tab, setTab] = useState<'notes' | 'status'>('notes');
  const L = (x: { tr: string; en: string }) => (locale === 'tr' ? x.tr : x.en);
  const live = SCREENS.filter((s) => s.status === 'live').length;
  const partial = SCREENS.filter((s) => s.status === 'partial').length;
  const shells: Shell[] = ['public', 'auth', 'app', 'studio', 'brand', 'admin'];
  return (
    <div className="mx-auto max-w-[760px] pb-10">
      <TopNavigation title={t('nav.updates')}>
        <div className="px-4 pb-3"><Segmented label={t('nav.updates')} value={tab} onChange={setTab} size="sm" options={[{ value: 'notes', label: t('updates.notes') }, { value: 'status', label: t('updates.status') }]} /></div>
      </TopNavigation>
      {tab === 'notes' ? (
        <div className="space-y-6 p-4">
          {CHANGELOG.map((e, idx) => (
            <Card key={e.version} className={cn('p-5', idx === 0 && 'border-primary/40')}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={idx === 0 ? 'primary' : 'neutral'}>v{e.version}</Badge>
                <time className="text-xs text-muted" dateTime={e.date}>{date(e.date)}</time>
                {idx === 0 && <Badge tone="success"><Sparkles className="h-3 w-3" />{t('updates.latest')}</Badge>}
              </div>
              <h2 className="mt-2 text-lg font-bold">{L(e.title)}</h2>
              <ul className="mt-3 space-y-2">
                {e.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /><span><Badge tone="outline" className="me-1.5">{t(`updates.areas.${it.area}` as TKey)}</Badge>{L(it)}</span></li>
                ))}
              </ul>
              {e.pending && (
                <>
                  <h3 className="mt-4 text-sm font-semibold">{t('updates.pending')}</h3>
                  <ul className="mt-2 space-y-2">{e.pending.map((p, i) => <li key={i} className="flex gap-2 text-sm text-muted"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />{L(p)}</li>)}</ul>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="p-3"><p className="text-2xl font-bold text-success">{live}</p><p className="text-xs text-muted">{t('status.live')}</p></Card>
            <Card className="p-3"><p className="text-2xl font-bold text-warning">{partial}</p><p className="text-xs text-muted">{t('status.partial')}</p></Card>
            <Card className="p-3"><p className="text-2xl font-bold text-muted">{SCREENS.length - live - partial}</p><p className="text-xs text-muted">{t('status.planned')}</p></Card>
          </div>
          {shells.map((sh) => (
            <section key={sh} className="mt-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t(`status.shells.${sh}` as TKey)}</h2>
              <ul className="divide-y divide-line rounded-md border border-line">
                {SCREENS.filter((s) => s.shell === sh).map((s) => (
                  <li key={s.no} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-8 shrink-0 text-xs tabular-nums text-muted">{String(s.no).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t(`screens.${s.key}` as TKey)}</span><span className="block truncate font-mono text-[11px] text-muted">{s.path}</span></span>
                    <span className="text-[11px] text-muted">F{s.phase}</span>
                    {s.status === 'live' ? <CheckCircle2 className="h-4 w-4 text-success" aria-label={t('status.live')} /> : s.status === 'partial' ? <CircleDashed className="h-4 w-4 text-warning" aria-label={t('status.partial')} /> : <Clock className="h-4 w-4 text-muted" aria-label={t('status.planned')} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
