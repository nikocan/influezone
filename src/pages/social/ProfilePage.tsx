import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid3x3, ShoppingBag, Lock, MoreHorizontal, Flag, UserX, VolumeX, Link as LinkIcon, Settings, MessageCircle, UserRoundX, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useBlockedSet, useErrorToast, useFollowingSet, useMutedSet, useProfileByUsername, useRequireAuth } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { SampleBadge } from '@/components/common/Labels';
import { FollowButton } from '@/components/social/FollowButton';
import { PostGridTile } from '@/components/social/PostCard';
import { ProductCard } from '@/components/commerce/ProductCard';
import { EmptyState, ErrorState, GridSkeleton, ListSkeleton } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Badge, Segmented } from '@/components/ui/misc';
import { Menu, MenuItem } from '@/components/ui/menu';
import { useSheets } from '@/components/social/Sheets';
import { useToast } from '@/components/ui/toast';
import { getCountry } from '@/i18n/locales';
import type { Profile } from '@/data/types';

export function CreatorProfileHeader({ profile }: { profile: Profile }) {
  const { t, compact, locale } = useI18n();
  const { session } = useAuth();
  const repo = useRepo();
  const nav = useNavigate();
  const qc = useQueryClient();
  const sheets = useSheets();
  const toast = useToast();
  const guard = useRequireAuth();
  const onError = useErrorToast();
  const { data: blocked } = useBlockedSet();
  const { data: muted } = useMutedSet();
  const mine = session?.userId === profile.id;
  const isBlocked = blocked?.has(profile.id);
  const isMuted = muted?.has(profile.id);
  const country = getCountry(profile.country);
  const message = useMutation({
    mutationFn: () => repo.startConversation(profile.id, profile.kind === 'brand' ? 'collaboration' : 'personal'),
    onSuccess: (c) => nav(`/messages/${c.id}`),
    onError,
  });
  const toggle = (fn: () => Promise<void>, msg: string) => fn().then(() => { qc.invalidateQueries(); toast({ variant: 'success', title: msg }); }, onError);

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-5">
        <CreatorAvatar profile={profile} size="xl" />
        <dl className="grid flex-1 grid-cols-3 text-center">
          <div><dt className="text-xs text-muted">{t('profile.posts')}</dt><dd className="order-first text-lg font-bold">{compact(profile.postCount)}</dd></div>
          <Link to={`/@${profile.username}/followers`} className="rounded-sm hover:bg-surface"><dt className="text-xs text-muted">{t('profile.followers')}</dt><dd className="text-lg font-bold">{compact(profile.followerCount)}</dd></Link>
          <Link to={`/@${profile.username}/following`} className="rounded-sm hover:bg-surface"><dt className="text-xs text-muted">{t('profile.following')}</dt><dd className="text-lg font-bold">{compact(profile.followingCount)}</dd></Link>
        </dl>
      </div>
      <div className="mt-3 space-y-1">
        <h1 className="flex flex-wrap items-center gap-1.5 text-base font-bold">
          {profile.displayName}{profile.verified && <VerifiedBadge />}
          {profile.kind === 'brand' && <Badge tone="gold">{t('profile.brand')}</Badge>}
          {profile.kind === 'person' && profile.isCreator && <Badge tone="primary">{t('profile.creator')}</Badge>}
          {profile.isSample && <SampleBadge />}
        </h1>
        {profile.bio && <p className="whitespace-pre-line text-sm">{profile.bio}</p>}
        <p className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{country.flag} {locale === 'tr' ? country.names.tr : country.names.en}</span>
          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 font-semibold text-primary"><Globe className="h-3.5 w-3.5" />{profile.website.replace(/^https?:\/\//, '')}</a>}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        {mine ? (
          <>
            <Button asChild variant="secondary" className="flex-1"><Link to="/settings/profile">{t('profile.edit')}</Link></Button>
            <Button asChild variant="secondary" className="flex-1"><Link to="/studio">{t('nav.studio')}</Link></Button>
            <Button asChild variant="secondary" size="icon" className="rounded-sm"><Link to="/settings" aria-label={t('nav.settings')}><Settings className="h-5 w-5" /></Link></Button>
          </>
        ) : isBlocked ? (
          <Button variant="secondary" className="flex-1" onClick={() => toggle(() => repo.unblock(profile.id), t('profile.unblocked'))}>{t('profile.unblock')}</Button>
        ) : (
          <>
            <FollowButton profileId={profile.id} size="md" className="flex-1" />
            <Button variant="secondary" className="flex-1" onClick={guard(() => message.mutate())} loading={message.isPending}><MessageCircle className="h-4 w-4" />{profile.kind === 'brand' ? t('profile.collaborate') : t('profile.message')}</Button>
            <Menu trigger={<Button variant="secondary" size="icon" className="rounded-sm" aria-label={t('common.more')}><MoreHorizontal className="h-5 w-5" /></Button>}>
              <MenuItem icon={<LinkIcon className="h-4 w-4" />} onSelect={() => { void navigator.clipboard?.writeText(`${location.origin}/@${profile.username}`).then(() => toast({ variant: 'success', title: t('share.copied') }), () => {}); }}>{t('profile.copyLink')}</MenuItem>
              {session && <MenuItem icon={<VolumeX className="h-4 w-4" />} onSelect={() => toggle(() => (isMuted ? repo.unmute(profile.id) : repo.mute(profile.id)), isMuted ? t('profile.unmuted') : t('report.muted'))}>{isMuted ? t('profile.unmute') : t('report.mute')}</MenuItem>}
              {session && <MenuItem icon={<UserX className="h-4 w-4" />} danger onSelect={() => toggle(() => repo.block(profile.id), t('report.blocked'))}>{t('report.block')}</MenuItem>}
              {session && <MenuItem icon={<Flag className="h-4 w-4" />} danger onSelect={() => sheets.openReport('profile', profile.id, profile.id)}>{t('report.report')}</MenuItem>}
            </Menu>
          </>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { handle = '' } = useParams();
  const username = decodeURIComponent(handle).replace(/^@/, '');
  const { t } = useI18n();
  const repo = useRepo();
  const { session } = useAuth();
  const prof = useProfileByUsername(username);
  const p = prof.data;
  const { data: following } = useFollowingSet();
  const { data: blocked } = useBlockedSet();
  const [tab, setTab] = useState<'posts' | 'shop'>('posts');
  const posts = useQuery({ queryKey: ['posts', 'author', p?.id], queryFn: () => repo.listPostsByAuthor(p!.id), enabled: !!p });
  const productIds = [...new Set((posts.data ?? []).flatMap((x) => x.tags.map((tg) => tg.productId)))];
  const products = useQuery({ queryKey: ['products', 'profile', productIds.join(',')], queryFn: () => repo.getProducts(productIds), enabled: productIds.length > 0 });
  const locked = p?.isPrivate && p.id !== session?.userId && !following?.has(p.id);

  if (prof.isLoading) return <div className="mx-auto max-w-[935px]"><TopNavigation title={`@${username}`} /><div className="p-4"><ListSkeleton rows={2} /></div><GridSkeleton /></div>;
  if (prof.isError) return <ErrorState error={prof.error} onRetry={() => prof.refetch()} />;
  if (!p) return <div className="mx-auto max-w-[935px]"><TopNavigation title={`@${username}`} /><EmptyState icon={<UserRoundX />} title={t('profile.notFound')} description={t('profile.notFoundDesc')} /></div>;

  return (
    <div className="mx-auto max-w-[935px] pb-6">
      <TopNavigation title={p.username} />
      <CreatorProfileHeader profile={p} />
      {blocked?.has(p.id) ? <EmptyState icon={<UserX />} title={t('profile.youBlocked')} /> : locked ? (
        <EmptyState icon={<Lock />} title={t('profile.private')} description={t('profile.privateDesc')} />
      ) : (
        <>
          <div className="mt-5 flex justify-center border-t border-line pt-3">
            <Segmented label={t('profile.tabs')} value={tab} onChange={setTab} options={[
              { value: 'posts', label: <span className="inline-flex items-center gap-1.5"><Grid3x3 className="h-4 w-4" />{t('profile.posts')}</span> },
              { value: 'shop', label: <span className="inline-flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" />{t('profile.shop')}</span> },
            ]} />
          </div>
          <div className="mt-3">
            {tab === 'posts' ? (
              posts.isLoading ? <GridSkeleton /> : !posts.data?.length ? (
                <EmptyState title={t('profile.noPosts')} action={session?.userId === p.id ? <Button asChild><Link to="/create">{t('profile.createFirst')}</Link></Button> : undefined} />
              ) : <div className="grid grid-cols-3 gap-0.5 md:gap-1">{posts.data.map((x) => <PostGridTile key={x.id} post={x} />)}</div>
            ) : (
              !productIds.length ? <EmptyState icon={<ShoppingBag />} title={t('profile.noProducts')} /> : (
                <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4">{products.data?.map((x) => <ProductCard key={x.id} product={x} />)}</div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function FollowListPage({ kind }: { kind: 'followers' | 'following' }) {
  const { handle = '' } = useParams();
  const username = decodeURIComponent(handle).replace(/^@/, '');
  const { t } = useI18n();
  const repo = useRepo();
  const prof = useProfileByUsername(username);
  const q = useQuery({ queryKey: ['followers', kind, prof.data?.id], queryFn: () => (kind === 'followers' ? repo.listFollowers(prof.data!.id) : repo.listFollowing(prof.data!.id)), enabled: !!prof.data });
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={`${username} · ${kind === 'followers' ? t('profile.followers') : t('profile.following')}`}>
        <div className="flex px-4">
          {(['followers', 'following'] as const).map((k) => (
            <Link key={k} to={`/@${username}/${k}`} replace className={`flex-1 border-b-2 py-2 text-center text-sm font-semibold ${k === kind ? 'border-fg' : 'border-transparent text-muted'}`}>{k === 'followers' ? t('profile.followers') : t('profile.following')}</Link>
          ))}
        </div>
      </TopNavigation>
      <div className="p-4">
        {prof.data?.isSample && kind === 'followers' && <p className="mb-3 rounded-sm bg-warning/10 p-2 text-xs text-muted">{t('demo.followerCountNote')}</p>}
        {q.isLoading || prof.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? (
          <EmptyState title={kind === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing')} />
        ) : <ul>{q.data.map((p) => <ProfileRowLazy key={p.id} profile={p} />)}</ul>}
      </div>
    </div>
  );
}

import { ProfileRow as ProfileRowLazy } from './ProfileRow';
