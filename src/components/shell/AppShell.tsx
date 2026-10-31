import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Bookmark, Clapperboard, Compass, Home, MessageCircle, PlusSquare, Settings, Sparkles, User, LayoutDashboard, Megaphone, Shield } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useConversations, useNotifications } from '@/data/hooks';
import { CreatorAvatar } from '@/components/common/CreatorAvatar';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/lib/utils';
import { DemoBanner } from './DemoBanner';
import type { ReactNode } from 'react';

function useBadges() {
  const { data: notes } = useNotifications();
  const { data: convs } = useConversations();
  return {
    activity: notes?.filter((n) => !n.read && n.type !== 'message').length ?? 0,
    messages: convs?.reduce((s, c) => s + (c.unreadCount > 0 ? 1 : 0), 0) ?? 0,
  };
}

function Dot({ n, label }: { n: number; label: string }) {
  if (!n) return null;
  return <span className="absolute -end-1 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white" aria-label={label}>{n > 9 ? '9+' : n}</span>;
}

export function MobileBottomNav() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const b = useBadges();
  const item = (to: string, label: string, icon: ReactNode, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => cn('flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium', isActive ? 'text-fg' : 'text-muted')}>
      {({ isActive }) => (
        <>
          <span className={cn('relative [&>svg]:h-6 [&>svg]:w-6', isActive && '[&>svg]:stroke-[2.4]')}>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-safe backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {item('/', t('nav.home'), <Home />, true)}
        {item('/explore', t('nav.explore'), <Compass />)}
        <NavLink to="/create" aria-label={t('nav.create')} className="flex flex-1 items-center justify-center">
          <span className="flex h-11 w-14 items-center justify-center rounded-md bg-primary text-white shadow-md shadow-primary/30"><PlusSquare className="h-6 w-6" /></span>
        </NavLink>
        {item('/activity', t('nav.activity'), <><Bell /><Dot n={b.activity} label={t('nav.unread', { n: b.activity })} /></>)}
        {item(profile ? `/@${profile.username}` : '/me', t('nav.profile'), profile ? <CreatorAvatar profile={profile} size="xs" className="!h-6 !w-6" /> : <User />)}
      </div>
    </nav>
  );
}

export function DesktopSidebar() {
  const { t } = useI18n();
  const { profile, isModerator } = useAuth();
  const b = useBadges();
  const link = (to: string, label: string, icon: ReactNode, end = false, extra?: ReactNode) => (
    <NavLink to={to} end={end} className={({ isActive }) => cn('group flex h-12 items-center gap-4 rounded-md px-3 text-[15px] transition-colors hover:bg-surface', isActive ? 'font-bold text-fg' : 'font-medium text-fg/80')}>
      <span className="relative [&>svg]:h-6 [&>svg]:w-6">{icon}{extra}</span>
      <span className="hidden xl:inline">{label}</span>
    </NavLink>
  );
  return (
    <aside className="scrollbar-none sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col overflow-y-auto border-e border-line px-3 py-5 md:flex xl:w-[244px]">
      <NavLink to="/" className="mb-6 flex h-10 items-center px-2" aria-label="Shopfluence">
        <Logo className="hidden h-8 xl:inline-flex" />
        <Logo className="h-8 xl:hidden" wordmark={false} />
      </NavLink>
      <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1">
        {link('/', t('nav.home'), <Home />, true)}
        {link('/explore', t('nav.explore'), <Compass />)}
        {link('/reels', t('nav.reels'), <Clapperboard />)}
        {link('/messages', t('nav.messages'), <MessageCircle />, false, <Dot n={b.messages} label={t('nav.unread', { n: b.messages })} />)}
        {link('/activity', t('nav.activity'), <Bell />, false, <Dot n={b.activity} label={t('nav.unread', { n: b.activity })} />)}
        {link('/create', t('nav.create'), <PlusSquare />)}
        {link('/saved', t('nav.saved'), <Bookmark />)}
        {link(profile ? `/@${profile.username}` : '/me', t('nav.profile'), profile ? <CreatorAvatar profile={profile} size="xs" className="!h-6 !w-6" /> : <User />)}
        <div className="my-3 border-t border-line" />
        {link('/studio', t('nav.studio'), <LayoutDashboard />)}
        {link('/brand', t('nav.brandPortal'), <Megaphone />)}
        {isModerator && link('/admin', t('nav.admin'), <Shield />)}
      </nav>
      <div className="flex flex-col gap-1">
        {link('/updates', t('nav.updates'), <Sparkles />)}
        {link('/settings', t('nav.settings'), <Settings />)}
      </div>
    </aside>
  );
}

/** Consumer social shell: left rail on desktop, bottom nav on mobile. */
export function AppShell() {
  const { pathname } = useLocation();
  const immersive = pathname.startsWith('/reels');
  // focused task screens hide the bottom nav on mobile so inputs are never covered
  const hideNav = immersive || /^\/messages\/.+/.test(pathname) || pathname.startsWith('/create');
  return (
    <div className="min-h-dvh bg-bg">
      <DemoBanner compact={immersive} />
      <div className="mx-auto flex max-w-[1280px]">
        <DesktopSidebar />
        <main id="main" className={cn('min-w-0 flex-1', !hideNav && 'pb-24 md:pb-8')}>
          <Outlet />
        </main>
      </div>
      {!hideNav && <MobileBottomNav />}
    </div>
  );
}
