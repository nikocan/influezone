import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Hash, Dumbbell, Headphones, Lamp, Plane, Shirt, Sparkles, UtensilsCrossed, Watch, type LucideIcon } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { useFeed } from '@/data/hooks';
import { CATEGORIES } from '@/data/demo/seed';
import { Input } from '@/components/ui/input';
import { SectionTitle } from '@/components/ui/misc';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { ProductCard } from '@/components/commerce/ProductCard';
import { PostGridTile } from '@/components/social/PostCard';
import { GridSkeleton, ErrorState } from '@/components/common/States';
import { useState } from 'react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = { Shirt, Sparkles, Headphones, Lamp, Dumbbell, UtensilsCrossed, Plane, Watch };

export function SearchBox({ initial = '', autoFocus }: { initial?: string; autoFocus?: boolean }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState(initial);
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); }} className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('nav.search')} className="rounded-full bg-surface ps-10" autoFocus={autoFocus} type="search" enterKeyHint="search" />
    </form>
  );
}

export function ExplorePage() {
  const { t, compact } = useI18n();
  const repo = useRepo();
  const creators = useQuery({ queryKey: ['trending', 'creators'], queryFn: () => repo.listTrendingCreators(10) });
  const products = useQuery({ queryKey: ['trending', 'products'], queryFn: () => repo.listTrendingProducts(8) });
  const brands = useQuery({ queryKey: ['trending', 'brands'], queryFn: () => repo.listBrands(8) });
  const tags = useQuery({ queryKey: ['trending', 'tags'], queryFn: () => repo.listTrendingHashtags(10) });
  const grid = useFeed({ mode: 'trending' });

  return (
    <div className="mx-auto max-w-[935px] px-4 py-4 md:py-6">
      <h1 className="sr-only">{t('nav.explore')}</h1>
      <SearchBox />

      <section className="mt-6" aria-labelledby="cats">
        <SectionTitle><span id="cats">{t('explore.categories')}</span></SectionTitle>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {CATEGORIES.map((c) => {
            const I = CATEGORY_ICONS[c.icon]!;
            return (
              <li key={c.slug}>
                <Link to={`/explore/c/${c.slug}`} className="flex flex-col items-center gap-1.5 rounded-md bg-surface p-3 text-center hover:bg-line/60">
                  <I className="h-6 w-6 text-primary" aria-hidden />
                  <span className="text-xs font-medium">{t(`categories.${c.slug}` as TKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <SectionTitle action={<Link to="/explore/trending/creators" className="text-sm font-semibold text-primary">{t('common.seeAll')}</Link>}>{t('explore.trendingCreators')}</SectionTitle>
        <ul className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 py-1">
          {creators.data?.map((p) => (
            <li key={p.id}>
              <Link to={`/@${p.username}`} className="flex w-20 flex-col items-center text-center">
                <CreatorAvatar profile={p} size="lg" ring />
                <span className="mt-2 flex max-w-full items-center gap-0.5 text-xs font-semibold"><span className="truncate">{p.username}</span>{p.verified && <VerifiedBadge className="h-3 w-3" />}</span>
                <span className="text-[11px] text-muted">{compact(p.followerCount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <SectionTitle action={<Link to="/explore/trending/products" className="text-sm font-semibold text-primary">{t('common.seeAll')}</Link>}>{t('explore.trendingProducts')}</SectionTitle>
        <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
          {products.data?.map((p) => <li key={p.id} className="w-36 shrink-0"><ProductCard product={p} /></li>)}
        </ul>
      </section>

      <section className="mt-8">
        <SectionTitle action={<Link to="/explore/trending/brands" className="text-sm font-semibold text-primary">{t('common.seeAll')}</Link>}>{t('explore.trendingBrands')}</SectionTitle>
        <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
          {brands.data?.map((b) => (
            <li key={b.id}>
              <Link to={`/@${b.username}`} className="flex w-40 items-center gap-2 rounded-md border border-line p-2.5">
                <CreatorAvatar profile={b} size="sm" />
                <span className="min-w-0"><span className="flex items-center gap-1 text-sm font-semibold"><span className="truncate">{b.displayName}</span>{b.verified && <VerifiedBadge className="h-3.5 w-3.5" />}</span><span className="text-xs text-muted">{compact(b.followerCount)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {tags.data && tags.data.length > 0 && (
        <section className="mt-8">
          <SectionTitle>{t('explore.trendingTags')}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {tags.data.map((h) => (
              <li key={h.tag}><Link to={`/tag/${encodeURIComponent(h.tag)}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm hover:bg-surface"><Hash className="h-3.5 w-3.5 text-primary" aria-hidden />{h.tag}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle>{t('explore.trendingPosts')}</SectionTitle>
        {grid.isLoading ? <GridSkeleton /> : grid.isError ? <ErrorState error={grid.error} onRetry={() => grid.refetch()} /> : (
          <div className="grid grid-cols-3 gap-0.5 md:gap-1">{grid.data?.map((p) => <PostGridTile key={p.id} post={p} />)}</div>
        )}
      </section>
    </div>
  );
}
