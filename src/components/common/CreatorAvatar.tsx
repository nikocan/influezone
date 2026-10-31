import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import type { Profile } from '@/data/types';
import { useI18n } from '@/i18n/I18nProvider';

const sizes = { xs: 'h-7 w-7 text-[10px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' } as const;

export function CreatorAvatar({ profile, size = 'md', ring, className }: { profile: Pick<Profile, 'displayName' | 'avatarUrl' | 'kind'> | null | undefined; size?: keyof typeof sizes; ring?: boolean; className?: string }) {
  const [err, setErr] = useState(false);
  const name = profile?.displayName ?? '?';
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-primary-soft font-semibold text-primary', profile?.kind === 'brand' ? 'rounded-sm' : 'rounded-full', ring && 'ring-2 ring-primary ring-offset-2 ring-offset-bg', sizes[size], className)}>
      {profile?.avatarUrl && !err ? (
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setErr(true)} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return <BadgeCheck className={cn('inline h-4 w-4 shrink-0 fill-primary text-white', className)} aria-label={t('profile.verified')} role="img" />;
}
