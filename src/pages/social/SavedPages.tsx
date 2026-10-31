import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Lock, Trash2, FolderPlus, ShoppingBag, BellRing } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useRepo } from '@/providers/AuthProvider';
import { qk, useCollections, useErrorToast } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { EmptyState, ErrorState, GridSkeleton } from '@/components/common/States';
import { PostGridTile } from '@/components/social/PostCard';
import { ProductCard } from '@/components/commerce/ProductCard';
import { Segmented } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/common/SmartImage';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import type { Collection } from '@/data/types';
import { Modal } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/misc';

function useCollectionContent(cols: Collection[]) {
  const repo = useRepo();
  const postIds = [...new Set(cols.flatMap((c) => c.items.filter((i) => i.kind === 'post').map((i) => i.refId)))];
  const productIds = [...new Set(cols.flatMap((c) => c.items.filter((i) => i.kind === 'product').map((i) => i.refId)))];
  const posts = useQuery({ queryKey: ['posts', 'saved', postIds.join(',')], queryFn: async () => (await Promise.all(postIds.map((id) => repo.getPost(id)))).filter((p) => !!p), enabled: postIds.length > 0 });
  const products = useQuery({ queryKey: ['products', 'saved', productIds.join(',')], queryFn: () => repo.getProducts(productIds), enabled: productIds.length > 0 });
  return { posts: posts.data ?? [], products: products.data ?? [], loading: posts.isLoading || products.isLoading };
}

export function SavedPage() {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const cols = useCollections();
  const [tab, setTab] = useState<'collections' | 'products'>(() => (new URLSearchParams(location.search).get('tab') === 'products' ? 'products' : 'collections'));
  const content = useCollectionContent(cols.data ?? []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const create = useMutation({ mutationFn: () => repo.createCollection(name, isPrivate), onSuccess: () => { setCreating(false); setName(''); qc.invalidateQueries({ queryKey: qk.collections }); }, onError });
  const cover = (c: Collection) => {
    const first = c.items.find((i) => i.kind === 'post');
    const p = content.posts.find((x) => x.id === first?.refId);
    const m = p?.media[0];
    return m?.type === 'video' ? m.posterUrl ?? undefined : m?.url;
  };
  return (
    <div className="mx-auto max-w-[935px]">
      <TopNavigation title={t('nav.saved')} actions={<Button variant="ghost" size="icon" onClick={() => setCreating(true)} aria-label={t('collections.new')}><FolderPlus className="h-5 w-5" /></Button>}>
        <div className="px-4 pb-3"><Segmented label={t('nav.saved')} value={tab} onChange={setTab} size="sm" options={[{ value: 'collections', label: t('collections.title') }, { value: 'products', label: t('collections.savedProducts') }]} /></div>
      </TopNavigation>
      <div className="p-4">
        {cols.isLoading ? <GridSkeleton /> : cols.isError ? <ErrorState error={cols.error} onRetry={() => cols.refetch()} /> : tab === 'collections' ? (
          !cols.data?.length ? <EmptyState icon={<Bookmark />} title={t('collections.empty')} description={t('collections.emptyDesc')} action={<Button onClick={() => setCreating(true)}>{t('collections.new')}</Button>} /> : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cols.data.map((c) => (
                <li key={c.id}>
                  <Link to={`/saved/${c.id}`} className="block">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-surface">
                      {cover(c) ? <SmartImage src={cover(c)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted"><Bookmark className="h-8 w-8" /></div>}
                      {c.isPrivate && <Lock className="absolute end-2 top-2 h-4 w-4 text-white drop-shadow" aria-label={t('collections.private')} />}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">{t('collections.items', { n: c.items.length })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            <div className="mb-4 flex justify-end"><Button asChild variant="secondary" size="sm"><Link to="/settings/price-alerts"><BellRing className="h-4 w-4" />{t('alerts.title')}</Link></Button></div>
            {!content.products.length ? <EmptyState icon={<ShoppingBag />} title={t('collections.noProducts')} description={t('collections.noProductsDesc')} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{content.products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
          </>
        )}
      </div>
      <Modal open={creating} onOpenChange={setCreating} title={t('collections.new')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
          <Field label={t('collections.name')}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />}</Field>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} label={t('collections.private')} description={t('collections.privateDesc')} />
          <Button type="submit" block loading={create.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
        </form>
      </Modal>
    </div>
  );
}

export function CollectionPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const col = useQuery({ queryKey: ['collection', id], queryFn: () => repo.getCollection(id) });
  const content = useCollectionContent(col.data ? [col.data] : []);
  const [confirm, setConfirm] = useState(false);
  const del = useMutation({ mutationFn: () => repo.deleteCollection(id), onSuccess: () => { qc.invalidateQueries({ queryKey: qk.collections }); nav('/saved', { replace: true }); }, onError });
  return (
    <div className="mx-auto max-w-[935px]">
      <TopNavigation title={col.data?.name ?? t('collections.title')} actions={col.data && <Button variant="ghost" size="icon" onClick={() => setConfirm(true)} aria-label={t('collections.delete')}><Trash2 className="h-5 w-5" /></Button>} />
      <div className="p-4">
        {col.isLoading || content.loading ? <GridSkeleton /> : !col.data ? <EmptyState title={t('common.notFound')} /> : col.data.items.length === 0 ? <EmptyState icon={<Bookmark />} title={t('collections.emptyOne')} /> : (
          <>
            {content.posts.length > 0 && <div className="grid grid-cols-3 gap-0.5">{content.posts.map((p) => <PostGridTile key={p.id} post={p} />)}</div>}
            {content.products.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{content.products.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
          </>
        )}
      </div>
      <ConfirmationDialog open={confirm} onOpenChange={setConfirm} title={t('collections.delete')} description={t('collections.deleteDesc')} confirmLabel={t('common.delete')} danger loading={del.isPending} onConfirm={() => del.mutate()} />
    </div>
  );
}
