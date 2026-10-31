import { Link } from 'react-router-dom';
import type { Profile } from '@/data/types';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { FollowButton } from '@/components/social/FollowButton';
import { SampleBadge } from '@/components/common/Labels';
import { useI18n } from '@/i18n/I18nProvider';

export function ProfileRow({ profile, onNavigate, action }: { profile: Profile; onNavigate?: () => void; action?: React.ReactNode }) {
  const { t, compact } = useI18n();
  return (
    <li className="flex items-center gap-3 py-1.5">
      <Link to={`/@${profile.username}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-sm">
        <CreatorAvatar profile={profile} />
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold"><span className="truncate">{profile.username}</span>{profile.verified && <VerifiedBadge className="h-3.5 w-3.5" />}{profile.isSample && <SampleBadge className="ms-1" />}</span>
          <span className="block truncate text-xs text-muted">{profile.displayName} · {t('profile.followersN', { n: compact(profile.followerCount) })}</span>
        </span>
      </Link>
      {action ?? <FollowButton profileId={profile.id} compact />}
    </li>
  );
}
