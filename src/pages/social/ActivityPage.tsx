import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Info, BellRing } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { qk, useNotifications, useProfilesMap } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { CreatorAvatar } from '@/components/common/CreatorAvatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { FollowButton } from '@/components/social/FollowButton';
import type { AppNotification, Profile } from '@/data/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICON = { follow: UserPlus, like: Heart, comment: MessageCircle, mention: AtSign, message: MessageCircle, system: Info, price_alert: BellRing };

export function NotificationItem({ n, actor }: { n: AppNotification; actor?: Profile }) {
  const { t, relative } = useI18n();
  const I = ICON[n.type];
  const href = n.type === 'follow' && actor ? `/@${actor.username}` : n.type === 'message' ? '/messages' : n.postId ? `/p/${n.postId}${n.type === 'comment' || n.type === 'mention' ? '#comments' : ''}` : '#';
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', !n.read && 'bg-primary-soft/40')}>
      <span className="relative">
        <CreatorAvatar profile={actor} />
        <span className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bg bg-primary text-white"><I className="h-2.5 w-2.5" aria-hidden /></span>
      </span>
      <Link to={href} className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{actor?.username ?? 'Shopfluence'}</span>{' '}
        {t(`notifications.${n.type}` as TKey)}
        {n.body && <span className="text-muted">: “{n.body}”</span>}
        <span className="ms-1 text-muted">· {relative(n.createdAt)}</span>
      </Link>
      {n.type === 'follow' && actor && <FollowButton profileId={actor.id} compact />}
    </li>
  );
}

export function ActivityPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const notes = useNotifications();
  const items = (notes.data ?? []).filter((n) => n.type !== 'message');
  const actors = useProfilesMap(items.map((n) => n.actorId ?? ''));
  const mark = useMutation({ mutationFn: () => repo.markNotificationsRead(), onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) });
  const unread = items.some((n) => !n.read);
  useEffect(() => {
    if (!unread) return;
    const id = setTimeout(() => mark.mutate(), 2500); // mark read after the user has seen the list
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);
  const today = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 864e5);
  const earlier = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() >= 864e5);
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('nav.activity')} back={false} actions={unread && <Button variant="ghost" size="sm" onClick={() => mark.mutate()}>{t('notifications.markAll')}</Button>} />
      {notes.isLoading ? <div className="p-4"><ListSkeleton /></div> : notes.isError ? <ErrorState error={notes.error} onRetry={() => notes.refetch()} /> : items.length === 0 ? (
        <EmptyState icon={<Bell />} title={t('notifications.empty')} description={t('notifications.emptyDesc')} />
      ) : (
        <>
          {today.length > 0 && <><h2 className="px-4 pt-4 text-sm font-bold">{t('notifications.today')}</h2><ul>{today.map((n) => <NotificationItem key={n.id} n={n} actor={actors.data?.get(n.actorId ?? '')} />)}</ul></>}
          {earlier.length > 0 && <><h2 className="px-4 pt-4 text-sm font-bold">{t('notifications.earlier')}</h2><ul>{earlier.map((n) => <NotificationItem key={n.id} n={n} actor={actors.data?.get(n.actorId ?? '')} />)}</ul></>}
        </>
      )}
    </div>
  );
}
