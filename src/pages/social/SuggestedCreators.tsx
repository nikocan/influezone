import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepo, useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { FollowButton } from '@/components/social/FollowButton';
import { cn } from '@/lib/utils';

export function SuggestedCreators({ compact }: { compact?: boolean }) {
  const repo = useRepo();
  const { session } = useAuth();
  const { t, compact: c } = useI18n();
  const q = useQuery({ queryKey: ['suggested', session?.userId ?? 'guest'], queryFn: () => repo.listSuggestedCreators(8) });
  if (!q.data?.length) return null;
  return (
    <section className={cn('border-b border-line py-4 md:rounded-md md:border md:px-4', compact ? 'mb-4 md:mb-6' : 'mt-2')} aria-label={t('feed.suggested')}>
      <div className="mb-3 flex items-center justify-between px-4 md:px-0">
        <h2 className="text-sm font-semibold">{t('feed.suggested')}</h2>
        <Link to="/explore/trending/creators" className="text-sm font-semibold text-primary">{t('common.seeAll')}</Link>
      </div>
      <ul className="scrollbar-none flex gap-3 overflow-x-auto px-4 md:px-0">
        {q.data.map((p) => (
          <li key={p.id} className="flex w-36 shrink-0 flex-col items-center rounded-md border border-line p-3 text-center">
            <Link to={`/@${p.username}`} className="flex flex-col items-center">
              <CreatorAvatar profile={p} size="lg" />
              <span className="mt-2 flex max-w-full items-center gap-1 text-sm font-semibold"><span className="truncate">{p.username}</span>{p.verified && <VerifiedBadge className="h-3.5 w-3.5" />}</span>
              <span className="text-xs text-muted">{t('profile.followersN', { n: c(p.followerCount) })}</span>
            </Link>
            <FollowButton profileId={p.id} className="mt-3 w-full" compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
