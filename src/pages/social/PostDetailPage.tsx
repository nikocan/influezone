import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { usePost, useProfile, useProducts } from '@/data/hooks';
import { useRepo } from '@/providers/AuthProvider';
import { PostCard, PostGridTile } from '@/components/social/PostCard';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { EmptyState, ErrorState, FeedSkeleton } from '@/components/common/States';
import { useEffect } from 'react';
import { useSheets } from '@/components/social/Sheets';

export function PostDetailPage() {
  const { postId } = useParams();
  const { t } = useI18n();
  const repo = useRepo();
  const sheets = useSheets();
  const post = usePost(postId);
  const author = useProfile(post.data?.authorId);
  const products = useProducts(post.data?.tags.map((x) => x.productId) ?? []);
  const more = useQuery({ queryKey: ['posts', 'author', post.data?.authorId], queryFn: () => repo.listPostsByAuthor(post.data!.authorId), enabled: !!post.data });

  useEffect(() => {
    if (!post.data) return;
    if (location.hash === '#comments') sheets.openComments(post.data.id);
    if (location.hash === '#likes') sheets.openLikes(post.data.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.data?.id]);

  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('post.title')} />
      {post.isLoading ? <FeedSkeleton count={1} /> : post.isError ? <ErrorState error={post.error} onRetry={() => post.refetch()} /> : !post.data ? (
        <EmptyState icon={<FileQuestion />} title={t('post.notFound')} description={t('post.notFoundDesc')} />
      ) : (
        <div className="md:pt-4">
          <PostCard post={post.data} author={author.data ?? undefined} products={products.data} />
          {(more.data?.filter((p) => p.id !== post.data!.id).length ?? 0) > 0 && (
            <section className="px-4 py-4 md:px-0">
              <h2 className="mb-3 text-sm font-semibold">{t('post.moreFrom', { name: author.data?.username ?? '' })}</h2>
              <div className="grid grid-cols-3 gap-0.5">{more.data!.filter((p) => p.id !== post.data!.id).slice(0, 9).map((p) => <PostGridTile key={p.id} post={p} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
