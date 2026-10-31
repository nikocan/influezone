import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Clapperboard } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useFeed, useProfilesMap, useProducts } from '@/data/hooks';
import { VideoPlayer } from '@/components/social/VideoPlayer';
import { EngagementActions, useLikeAction } from '@/components/social/EngagementActions';
import { useSheets } from '@/components/social/Sheets';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { DisclosureLabel, SampleBadge } from '@/components/common/Labels';
import { FollowButton } from '@/components/social/FollowButton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { RichText } from '@/components/social/RichText';
import { SmartImage } from '@/components/common/SmartImage';
import type { Post, Product, Profile } from '@/data/types';
import { TagOverlay } from '@/components/social/MediaFrame';
import { useState } from 'react';

function Reel({ post, author, products }: { post: Post; author?: Profile; products?: Map<string, Product> }) {
  const { t } = useI18n();
  const sheets = useSheets();
  const { likeOnly } = useLikeAction(post);
  const [tags, setTags] = useState(false);
  const media = post.media[0]!;
  const productIds = [...new Set(post.tags.map((x) => x.productId))];
  const first = products?.get(productIds[0] ?? '');
  return (
    <section className="relative h-[100dvh] w-full snap-start snap-always bg-black md:h-[calc(100dvh-2rem)] md:my-4 md:overflow-hidden md:rounded-lg" aria-label={t('post.by', { name: author?.displayName ?? '' })}>
      <VideoPlayer media={media} onDoubleTap={likeOnly} />
      <TagOverlay media={media} tags={post.tags} products={products} visible={tags} onTagClick={(id) => sheets.openProduct(id, { postId: post.id, creatorId: post.authorId })} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute bottom-6 end-2 pb-safe"><EngagementActions post={post} layout="column" onDark /></div>
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-6 pe-20 text-white">
        <div className="flex items-center gap-2">
          <Link to={author ? `/@${author.username}` : '#'} className="flex items-center gap-2">
            <CreatorAvatar profile={author} size="sm" />
            <span className="text-sm font-semibold">{author?.username}</span>
            {author?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </Link>
          {author && <FollowButton profileId={author.id} compact className="border-white/40 bg-white/15 text-white hover:bg-white/25" />}
        </div>
        <div className="flex flex-wrap gap-1.5"><DisclosureLabel disclosure={post.disclosure} onDark />{post.isSample && <SampleBadge />}</div>
        <p className="line-clamp-2 text-sm"><RichText text={post.caption} /></p>
        {first && (
          <div className="flex gap-2">
            <button type="button" onClick={() => sheets.openProduct(first.id, { postId: post.id, creatorId: post.authorId })} className="flex max-w-[260px] items-center gap-2 rounded-sm bg-white/95 p-1.5 pe-3 text-start text-[#111]">
              <SmartImage src={first.images[0]} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
              <span className="min-w-0"><span className="block truncate text-[11px] text-[#666]">{first.brandName}</span><span className="block truncate text-sm font-semibold">{first.title}</span></span>
              <ShoppingBag className="ms-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
            </button>
            {productIds.length > 0 && (
              <button type="button" onClick={() => setTags((v) => !v)} aria-pressed={tags} className="rounded-sm bg-white/20 px-3 text-xs font-semibold backdrop-blur">{tags ? t('product.hideTags') : t('product.showTags')}</button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ReelsPage() {
  const { t } = useI18n();
  const feed = useFeed({ mode: 'for_you' });
  const videos = (feed.data ?? []).filter((p) => p.type === 'video');
  const authors = useProfilesMap(videos.map((p) => p.authorId));
  const products = useProducts(videos.flatMap((p) => p.tags.map((x) => x.productId)));
  return (
    <div className="relative mx-auto max-w-[460px] bg-black md:bg-transparent">
      <Link to="/" className="fixed start-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur md:hidden" aria-label={t('common.back')}><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></Link>
      <h1 className="sr-only">{t('nav.reels')}</h1>
      {feed.isError ? <ErrorState error={feed.error} onRetry={() => feed.refetch()} className="h-dvh text-white" /> : feed.isLoading ? <div className="h-dvh animate-pulse bg-neutral-900" /> : videos.length === 0 ? (
        <EmptyState icon={<Clapperboard />} title={t('reels.empty')} className="h-dvh bg-bg" />
      ) : (
        <div className="snap-feed h-[100dvh] overflow-y-scroll scrollbar-none md:h-dvh">
          {videos.map((p) => <Reel key={p.id} post={p} author={authors.data?.get(p.authorId)} products={products.data} />)}
        </div>
      )}
    </div>
  );
}
