import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { useFollowingSet, useFollowToggle, useRequireAuth } from '@/data/hooks';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export function FollowButton({ profileId, size = 'sm', className, compact }: { profileId: string; size?: 'sm' | 'md'; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const { session } = useAuth();
  const { data: following } = useFollowingSet();
  const toggle = useFollowToggle();
  const guard = useRequireAuth();
  if (session?.userId === profileId) return null;
  const isFollowing = following?.has(profileId) ?? false;
  return (
    <Button
      size={size}
      variant={isFollowing ? 'secondary' : 'primary'}
      className={cn(compact && 'h-8 px-3 text-xs', className)}
      aria-pressed={isFollowing}
      onClick={guard(() => toggle.mutate({ id: profileId, follow: !isFollowing }))}
    >
      {isFollowing ? t('social.following') : t('social.follow')}
    </Button>
  );
}
