import { Link, useLocation } from 'react-router-dom';
import { Construction, ListChecks } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { SCREENS } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/misc';

/**
 * Honest placeholder for screens scheduled for a later phase. No fake numbers, no dead buttons:
 * it states what the screen will do, what it depends on, and links to the status table.
 */
export function PlannedScreen({ screenKey }: { screenKey: string }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const s = SCREENS.find((x) => x.key === screenKey);
  const phase = s?.phase ?? 0;
  return (
    <div className="mx-auto max-w-2xl py-6">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-soft text-primary"><Construction className="h-6 w-6" /></span>
          <div>
            <h1 className="text-xl font-bold">{t(`screens.${screenKey}` as TKey)}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="warning">{t('status.planned')}</Badge><Badge tone="outline">{t('status.phase', { n: phase })}</Badge><Badge tone="outline" className="font-mono">{pathname}</Badge></div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{t(`phases.p${phase}` as TKey)}</p>
        <div className="mt-4 rounded-md bg-surface p-3 text-sm">
          <p className="font-semibold">{t('status.dependsOn')}</p>
          <p className="text-muted">{t(`phases.deps${phase}` as TKey)}</p>
        </div>
        <Button asChild variant="secondary" className="mt-5"><Link to="/updates"><ListChecks className="h-4 w-4" />{t('status.viewAll')}</Link></Button>
      </Card>
    </div>
  );
}
