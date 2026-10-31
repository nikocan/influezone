import { NavLink, Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { ICONS } from './icons';
import { SCREENS } from '@/config/routes';
import { DemoBanner } from './DemoBanner';
import { Logo } from '@/components/common/Logo';
import { Badge } from '@/components/ui/misc';

interface NavItem { to: string; key: string; icon: string; end?: boolean }

/** Responsive dashboard shell for Creator Studio, Brand portal and Admin console. */
export function PortalShell({ titleKey, nav, tone }: { titleKey: TKey; nav: readonly NavItem[]; tone: 'studio' | 'brand' | 'admin' }) {
  const { t } = useI18n();
  const status = (key: string) => SCREENS.find((s) => s.key === key)?.status;
  return (
    <div className="min-h-dvh bg-surface">
      <DemoBanner />
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-bg p-4 lg:flex">
          <Link to="/" className="mb-1 flex h-10 items-center"><Logo className="h-7" /></Link>
          <p className={cn('mb-4 px-1 text-xs font-bold uppercase tracking-wider', tone === 'admin' ? 'text-danger' : tone === 'brand' ? 'text-gold' : 'text-primary')}>{t(titleKey)}</p>
          <nav aria-label={t(titleKey)} className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {nav.map((n) => {
              const I = ICONS[n.icon]!;
              const st = status(n.key);
              return (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex min-h-[40px] items-center gap-3 rounded-sm px-3 text-sm', isActive ? 'bg-primary-soft font-semibold text-primary' : 'text-fg/80 hover:bg-surface')}>
                  <I className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{t(`screens.${n.key}` as TKey)}</span>
                  {st === 'planned' && <span className="text-[10px] font-medium text-muted">{t('status.soon')}</span>}
                </NavLink>
              );
            })}
          </nav>
          <Link to="/" className="mt-3 flex min-h-[40px] items-center gap-2 rounded-sm px-3 text-sm text-muted hover:bg-surface"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t('nav.backToApp')}</Link>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center gap-2 px-2">
              <Link to="/" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface" aria-label={t('nav.backToApp')}><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></Link>
              <span className="font-bold">{t(titleKey)}</span>
              {tone === 'admin' && <Badge tone="danger">{t('nav.admin')}</Badge>}
            </div>
            <nav aria-label={t(titleKey)} className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('shrink-0 rounded-full px-3 py-1.5 text-sm', isActive ? 'bg-fg font-semibold text-bg' : 'bg-surface text-fg/80')}>
                  {t(`screens.${n.key}` as TKey)}
                </NavLink>
              ))}
            </nav>
          </header>
          <main id="main" className="mx-auto max-w-6xl p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
