import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, Search, Users } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useFeed, useProfilesMap, useProducts } from '@/data/hooks';
import type { FeedMode } from '@/data/types';
import { PostCard } from '@/components/social/PostCard';
import { EmptyState, ErrorState, FeedSkeleton } from '@/components/common/States';
import { Logo } from '@/components/common/Logo';
import { Chip, Segmented } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/data/demo/seed';
import { SuggestedCreators } from './SuggestedCreators';
import { useAuth } from '@/providers/AuthProvider';

const SCROLL_KEY = 'sf.home.scroll';

export function HomePage() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const mode = (params.get('feed') as FeedMode) || 'for_you';
  const category = params.get('c');
  const feed = useFeed({ mode, category });
  const posts = feed.data ?? [];
  const authors = useProfilesMap(posts.map((p) => p.authorId));
  const products = useProducts(posts.flatMap((p) => p.tags.map((x) => x.productId)));

  // Preserve scroll position when returning from product / post detail
  useEffect(() => {
    const y = Number(sessionStorage.getItem(SCROLL_KEY) || 0);
    if (y && feed.isSuccess) requestAnimationFrame(() => window.scrollTo(0, y));
    const save = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    return () => save();
  }, [feed.isSuccess]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v === null ? next.delete(k) : next.set(k, v);
    sessionStorage.removeItem(SCROLL_KEY);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[620px]">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur md:border-none md:pt-4">
        <div className="flex h-14 items-center gap-2 px-3 md:hidden">
          <Logo className="h-7" />
          <div className="flex-1" />
          <Button asChild variant="ghost" size="icon"><Link to="/search" aria-label={t('nav.search')}><Search className="h-6 w-6" /></Link></Button>
          <Button asChild variant="ghost" size="icon"><Link to="/saved" aria-label={t('nav.saved')}><Bookmark className="h-6 w-6" /></Link></Button>
        </div>
        <div className="flex items-center justify-center px-3 pb-2 md:justify-start md:px-0">
          <Segmented<FeedMode>
            label={t('feed.label')}
            value={mode}
            onChange={(v) => set({ feed: v === 'for_you' ? null : v })}
            options={[{ value: 'for_you', label: t('feed.forYou') }, { value: 'following', label: t('feed.following') }, { value: 'trending', label: t('feed.trending') }]}
          />
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-3 md:px-0" role="toolbar" aria-label={t('feed.categories')}>
          <Chip active={!category} onClick={() => set({ c: null })}>{t('categories.all')}</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => set({ c: category === c.slug ? null : c.slug })}>{t(`categories.${c.slug}` as TKey)}</Chip>
          ))}
        </div>
      </header>

      <div className="md:pt-2">
        {feed.isLoading ? <FeedSkeleton /> : feed.isError ? <ErrorState error={feed.error} onRetry={() => feed.refetch()} /> : posts.length === 0 ? (
          mode === 'following' ? (
            <>
              <EmptyState icon={<Users />} title={session ? t('feed.followingEmpty') : t('feed.followingGuest')} description={t('feed.followingEmptyDesc')} />
              <SuggestedCreators />
            </>
          ) : (
            <EmptyState title={t('feed.empty')} description={t('feed.emptyDesc')} action={category ? <Button variant="secondary" onClick={() => set({ c: null })}>{t('feed.clearFilter')}</Button> : undefined} />
          )
        ) : (
          <>
            {posts.map((p, i) => (
              <div key={p.id}>
                <PostCard post={p} author={authors.data?.get(p.authorId)} products={products.data} priority={i === 0} />
                {i === 1 && mode === 'for_you' && <SuggestedCreators compact />}
              </div>
            ))}
            <p className="py-8 text-center text-sm text-muted">{t('feed.end')}</p>
          </>
        )}
      </div>
    </div>
  );
}
