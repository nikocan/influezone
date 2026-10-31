import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreHorizontal, ShoppingBag, Flag, Link2, UserX, Trash2 } from 'lucide-react';
import type { Post, Product, Profile } from '@/data/types';
import { useI18n } from '@/i18n/I18nProvider';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { SmartImage } from '@/components/common/SmartImage';
import { DisclosureLabel, SampleBadge } from '@/components/common/Labels';
import { Menu, MenuItem } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useErrorToast } from '@/data/hooks';
import { FollowButton } from './FollowButton';
import { EngagementActions, useLikeAction } from './EngagementActions';
import { PhotoCarousel } from './PhotoCarousel';
import { VideoPlayer } from './VideoPlayer';
import { TagOverlay } from './MediaFrame';
import { RichText } from './RichText';
import { useSheets } from './Sheets';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

export function PostHeader({ post, author, onDark }: { post: Post; author?: Profile; onDark?: boolean }) {
  const { t, relative } = useI18n();
  const sheets = useSheets();
  const toast = useToast();
  const { session } = useAuth();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useMutation({ mutationFn: () => repo.deletePost(post.id), onSuccess: () => { qc.invalidateQueries(); toast({ variant: 'success', title: t('post.deleted') }); setConfirmDelete(false); }, onError });
  const mine = session?.userId === post.authorId;
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 md:px-0', onDark && 'text-white')}>
      <Link to={author ? `/@${author.username}` : '#'} className="shrink-0"><CreatorAvatar profile={author} size="sm" /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Link to={author ? `/@${author.username}` : '#'} className="truncate text-sm font-semibold">{author?.username ?? '…'}</Link>
          {author?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          <span className={cn('text-sm', onDark ? 'text-white/70' : 'text-muted')}>· <time dateTime={post.createdAt}>{relative(post.createdAt)}</time></span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <DisclosureLabel disclosure={post.disclosure} onDark={onDark} />
          {post.isSample && <SampleBadge />}
        </div>
      </div>
      {author && !mine && <FollowButton profileId={author.id} compact />}
      <Menu trigger={<button type="button" className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full', onDark ? 'hover:bg-white/10' : 'hover:bg-surface')} aria-label={t('common.more')}><MoreHorizontal className="h-5 w-5" /></button>}>
        <MenuItem icon={<Link2 className="h-4 w-4" />} onSelect={() => { void navigator.clipboard?.writeText(`${location.origin}/p/${post.id}`).then(() => toast({ variant: 'success', title: t('share.copied') }), () => {}); }}>{t('share.copyLink')}</MenuItem>
        {mine ? (
          <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onSelect={() => setConfirmDelete(true)}>{t('common.delete')}</MenuItem>
        ) : session ? (
          <>
            <MenuItem icon={<Flag className="h-4 w-4" />} onSelect={() => sheets.openReport('post', post.id, post.authorId)}>{t('report.report')}</MenuItem>
            <MenuItem icon={<UserX className="h-4 w-4" />} onSelect={() => sheets.openReport('profile', post.authorId, post.authorId)}>{t('report.blockOrMute')}</MenuItem>
          </>
        ) : null}
      </Menu>
      <ConfirmationDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('post.deleteTitle')} description={t('post.deleteDesc')} confirmLabel={t('common.delete')} danger loading={del.isPending} onConfirm={() => del.mutate()} />
    </div>
  );
}

export function ProductRail({ post, products }: { post: Post; products?: Map<string, Product> }) {
  const { t } = useI18n();
  const sheets = useSheets();
  const ids = [...new Set(post.tags.map((t) => t.productId))];
  if (!ids.length) return null;
  return (
    <div className="px-4 md:px-0">
      <ul className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={t('product.taggedProducts')}>
        {ids.map((id) => {
          const p = products?.get(id);
          return (
            <li key={id} className="shrink-0">
              <button type="button" onClick={() => sheets.openProduct(id, { postId: post.id, creatorId: post.authorId })} className="flex w-[220px] items-center gap-2.5 rounded-sm border border-line bg-bg p-1.5 pe-3 text-start hover:bg-surface">
                <SmartImage src={p?.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] text-muted">{p?.brandName ?? '…'}</span>
                  <span className="block truncate text-sm font-semibold">{p?.title ?? ''}</span>
                </span>
                <ShoppingBag className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Feed post: header, media (photo/carousel/video) with product tags, actions, caption, product rail. */
export const PostCard = memo(function PostCard({ post, author, products, priority }: { post: Post; author?: Profile; products?: Map<string, Product>; priority?: boolean }) {
  const { t, num } = useI18n();
  const sheets = useSheets();
  const repo = useRepo();
  const [tagsOpen, setTagsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burst, setBurst] = useState(false);
  const { likeOnly } = useLikeAction(post);
  const first = post.media[0];
  const ratio = post.type === 'video' ? 4 / 5 : Math.max(4 / 5, Math.min(1.91, (first?.width ?? 4) / (first?.height ?? 5)));
  const onDouble = () => { likeOnly(); setBurst(true); setTimeout(() => setBurst(false), 600); };
  const hasTags = post.tags.length > 0;
  const long = post.caption.length > 120;

  return (
    <article className="border-b border-line pb-4 md:mb-6 md:rounded-md md:border md:px-4 md:pb-4" aria-labelledby={`post-${post.id}-author`}>
      <span id={`post-${post.id}-author`} className="sr-only">{t('post.by', { name: author?.displayName ?? '' })}</span>
      <PostHeader post={post} author={author} />
      <div className="relative w-full overflow-hidden bg-surface md:rounded-sm" style={{ aspectRatio: String(ratio) }}>
        {post.type === 'video' && first ? (
          <VideoPlayer media={first} onDoubleTap={onDouble} onView={() => repo.recordView(post.id)} />
        ) : (
          <PhotoCarousel
            media={post.media}
            onDoubleTap={onDouble}
            renderOverlay={(m, i) => <TagOverlay media={m} tags={post.tags.filter((tg) => tg.mediaIndex === i)} products={products} visible={tagsOpen} onTagClick={(pid) => sheets.openProduct(pid, { postId: post.id, creatorId: post.authorId })} />}
          />
        )}
        {post.type === 'video' && first && (
          <TagOverlay media={first} tags={post.tags} products={products} visible={tagsOpen} onTagClick={(pid) => sheets.openProduct(pid, { postId: post.id, creatorId: post.authorId })} />
        )}
        {hasTags && (
          <button type="button" onClick={() => setTagsOpen((v) => !v)} aria-pressed={tagsOpen} className="absolute bottom-3 start-3 flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur" aria-label={tagsOpen ? t('product.hideTags') : t('product.showTags')}>
            <ShoppingBag className="h-4 w-4" aria-hidden /> {num(new Set(post.tags.map((x) => x.productId)).size)}
          </button>
        )}
        {burst && <Heart className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-pop fill-white text-white drop-shadow-xl" aria-hidden />}
      </div>
      <div className="px-2 pt-1 md:px-0"><EngagementActions post={post} /></div>
      <div className="space-y-2 px-4 md:px-0">
        {post.likeCount > 0 && (
          <button type="button" className="text-sm font-semibold" onClick={() => sheets.openLikes(post.id)}>{t('social.likesCount', { n: num(post.likeCount) })}</button>
        )}
        {post.caption && (
          <p className={cn('whitespace-pre-line text-sm leading-relaxed', !expanded && long && 'line-clamp-2')}>
            <Link to={author ? `/@${author.username}` : '#'} className="me-1.5 font-semibold">{author?.username}</Link>
            <RichText text={post.caption} />
          </p>
        )}
        {long && !expanded && <button type="button" className="text-sm text-muted" onClick={() => setExpanded(true)}>{t('common.more')}</button>}
        {post.commentCount > 0 && <button type="button" className="block text-sm text-muted" onClick={() => sheets.openComments(post.id)}>{t('social.viewAllComments', { n: num(post.commentCount) })}</button>}
      </div>
      <div className="mt-3"><ProductRail post={post} products={products} /></div>
      {priority && first?.type === 'image' && <link rel="preload" as="image" href={first.url} />}
    </article>
  );
});

export function PostGridTile({ post }: { post: Post }) {
  const { t, compact } = useI18n();
  const m = post.media[0];
  return (
    <Link to={`/p/${post.id}`} className="group relative block aspect-square overflow-hidden bg-surface" aria-label={t('post.open', { caption: post.caption.slice(0, 60) })}>
      <SmartImage src={m?.type === 'video' ? m.posterUrl ?? undefined : m?.url} alt={m?.alt ?? ''} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
      <span className="absolute end-1.5 top-1.5 flex gap-1 text-white drop-shadow">
        {post.type === 'video' && <span className="rounded bg-black/40 px-1 text-[10px] font-bold">▶</span>}
        {post.type === 'carousel' && <span className="rounded bg-black/40 px-1 text-[10px] font-bold">⧉</span>}
        {post.tags.length > 0 && <ShoppingBag className="h-4 w-4" aria-hidden />}
      </span>
      <span className="absolute inset-0 hidden items-center justify-center gap-3 bg-black/35 text-sm font-semibold text-white group-hover:flex">
        <span className="flex items-center gap-1"><Heart className="h-4 w-4 fill-white" />{compact(post.likeCount)}</span>
      </span>
    </Link>
  );
}
