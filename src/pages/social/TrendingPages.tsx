import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hash } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { EmptyState, ErrorState, GridSkeleton, ListSkeleton } from '@/components/common/States';
import { ProfileRow } from './ProfileRow';
import { ProductCard } from '@/components/commerce/ProductCard';
import { PostGridTile } from '@/components/social/PostCard';
import { useFeed } from '@/data/hooks';
import { CATEGORIES } from '@/data/demo/seed';

export function TrendingCreatorsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: ['trending', 'creators', 'all'], queryFn: () => repo.listTrendingCreators(50) });
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('explore.trendingCreators')} />
      <div className="p-4">{q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <ul>{q.data!.map((p) => <ProfileRow key={p.id} profile={p} />)}</ul>}</div>
    </div>
  );
}

export function TrendingBrandsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: ['trending', 'brands', 'all'], queryFn: () => repo.listBrands(50) });
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('explore.trendingBrands')} />
      <div className="p-4">{q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState title={t('explore.noBrands')} /> : <ul>{q.data.map((p) => <ProfileRow key={p.id} profile={p} />)}</ul>}</div>
    </div>
  );
}

export function TrendingProductsPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: ['trending', 'products', 'all'], queryFn: () => repo.listTrendingProducts(60) });
  return (
    <div className="mx-auto max-w-[935px]">
      <TopNavigation title={t('explore.trendingProducts')} />
      <p className="px-4 pt-3 text-xs text-muted">{t('explore.trendingProductsHint')}</p>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">{q.isLoading ? <GridSkeleton /> : q.data?.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </div>
  );
}

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const repo = useRepo();
  const valid = CATEGORIES.some((c) => c.slug === slug);
  const posts = useFeed({ mode: 'for_you', category: slug });
  const products = useQuery({ queryKey: ['products', 'cat', slug], queryFn: () => repo.searchProducts('', slug), enabled: valid });
  if (!valid) return <><TopNavigation title={t('explore.categories')} /><EmptyState title={t('common.notFound')} /></>;
  return (
    <div className="mx-auto max-w-[935px]">
      <TopNavigation title={t(`categories.${slug}` as TKey)} />
      {(products.data?.length ?? 0) > 0 && (
        <section className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('search.tabs.products')}</h2>
          <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">{products.data!.map((p) => <li key={p.id} className="w-36 shrink-0"><ProductCard product={p} /></li>)}</ul>
        </section>
      )}
      <section className="px-4 pb-4">
        <h2 className="mb-3 text-sm font-semibold">{t('search.tabs.posts')}</h2>
        {posts.isLoading ? <GridSkeleton /> : !posts.data?.length ? <EmptyState title={t('feed.empty')} /> : <div className="grid grid-cols-3 gap-0.5">{posts.data.map((p) => <PostGridTile key={p.id} post={p} />)}</div>}
      </section>
    </div>
  );
}

export function HashtagPage() {
  const { tag = '' } = useParams();
  const { t, num } = useI18n();
  const repo = useRepo();
  const q = useQuery({ queryKey: ['posts', 'tag', tag], queryFn: () => repo.listPostsByHashtag(tag) });
  return (
    <div className="mx-auto max-w-[935px]">
      <TopNavigation title={`#${tag}`} />
      <div className="flex items-center gap-4 p-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary"><Hash className="h-8 w-8" /></span>
        <div><h1 className="text-xl font-bold">#{tag}</h1><p className="text-sm text-muted">{t('hashtag.posts', { n: num(q.data?.length ?? 0) })}</p></div>
      </div>
      <div className="px-4 pb-4">
        {q.isLoading ? <GridSkeleton /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState title={t('hashtag.empty')} action={<Link className="text-sm font-semibold text-primary" to="/create">{t('hashtag.beFirst')}</Link>} /> : (
          <div className="grid grid-cols-3 gap-0.5">{q.data.map((p) => <PostGridTile key={p.id} post={p} />)}</div>
        )}
      </div>
    </div>
  );
}
