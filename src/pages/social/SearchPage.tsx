import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, Hash } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useSearch } from '@/data/hooks';
import type { SearchFilters } from '@/data/types';
import { SearchBox } from './ExplorePage';
import { Chip, Segmented, Switch } from '@/components/ui/misc';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { CountrySelector } from '@/components/common/Selectors';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { ProfileRow } from './ProfileRow';
import { ProductCard } from '@/components/commerce/ProductCard';
import { PostGridTile } from '@/components/social/PostCard';
import { CATEGORIES } from '@/data/demo/seed';

type Tab = SearchFilters['type'];

/** Search results with type tabs and a filter sheet (category, country, verified, sort). */
export function SearchPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const filters: SearchFilters = {
    type: (params.get('type') as Tab) || 'all',
    category: params.get('category'),
    country: params.get('country'),
    verifiedOnly: params.get('verified') === '1',
    sort: (params.get('sort') as SearchFilters['sort']) || 'relevance',
  };
  const res = useSearch(q, filters);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === null || v === '' ? next.delete(k) : next.set(k, v));
    setParams(next, { replace: true });
  };
  const activeFilters = [filters.category, filters.country, filters.verifiedOnly ? '1' : null, filters.sort !== 'relevance' ? filters.sort : null].filter(Boolean).length;
  const r = res.data;
  const total = r ? r.creators.length + r.brands.length + r.products.length + r.posts.length + r.hashtags.length : 0;
  const tabs: Tab[] = ['all', 'creators', 'products', 'posts', 'brands', 'hashtags'];

  return (
    <div className="mx-auto max-w-[935px] px-4 py-4">
      <h1 className="sr-only">{t('search.title')}</h1>
      <div className="flex items-center gap-2">
        <div className="flex-1"><SearchBox initial={q} autoFocus={!q} key={q} /></div>
        <Button variant="secondary" size="icon" onClick={() => { setDraft(filters); setOpen(true); }} aria-label={t('search.filters')} className="relative">
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilters > 0 && <span className="absolute -end-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">{activeFilters}</span>}
        </Button>
      </div>
      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label={t('search.type')}>
        {tabs.map((tb) => <Chip key={tb} active={filters.type === tb} onClick={() => update({ type: tb === 'all' ? null : tb })}>{t(`search.tabs.${tb}` as TKey)}</Chip>)}
      </div>

      <div className="mt-5">
        {!q && !filters.category ? <EmptyState title={t('search.startTyping')} description={t('search.startTypingDesc')} /> :
          res.isLoading ? <ListSkeleton /> : res.isError ? <ErrorState error={res.error} onRetry={() => res.refetch()} /> : !r || total === 0 ? (
            <EmptyState icon={<SearchX />} title={t('search.noResults', { q })} description={t('search.noResultsDesc')} action={activeFilters ? <Button variant="secondary" onClick={() => update({ category: null, country: null, verified: null, sort: null })}>{t('search.clearFilters')}</Button> : undefined} />
          ) : (
            <div className="space-y-8">
              {(filters.type === 'all' || filters.type === 'creators') && r.creators.length > 0 && (
                <section><h2 className="mb-2 text-sm font-semibold">{t('search.tabs.creators')}</h2><ul className="space-y-1">{r.creators.slice(0, filters.type === 'all' ? 4 : 50).map((p) => <ProfileRow key={p.id} profile={p} />)}</ul></section>
              )}
              {(filters.type === 'all' || filters.type === 'brands') && r.brands.length > 0 && (
                <section><h2 className="mb-2 text-sm font-semibold">{t('search.tabs.brands')}</h2><ul className="space-y-1">{r.brands.slice(0, filters.type === 'all' ? 3 : 50).map((p) => <ProfileRow key={p.id} profile={p} />)}</ul></section>
              )}
              {(filters.type === 'all' || filters.type === 'products') && r.products.length > 0 && (
                <section><h2 className="mb-2 text-sm font-semibold">{t('search.tabs.products')}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{r.products.slice(0, filters.type === 'all' ? 4 : 60).map((p) => <ProductCard key={p.id} product={p} />)}</div></section>
              )}
              {(filters.type === 'all' || filters.type === 'hashtags') && r.hashtags.length > 0 && (
                <section><h2 className="mb-2 text-sm font-semibold">{t('search.tabs.hashtags')}</h2><ul className="flex flex-wrap gap-2">{r.hashtags.slice(0, 20).map((h) => <li key={h.tag}><Link to={`/tag/${encodeURIComponent(h.tag)}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm"><Hash className="h-3.5 w-3.5 text-primary" />{h.tag}<span className="text-muted">· {h.count}</span></Link></li>)}</ul></section>
              )}
              {(filters.type === 'all' || filters.type === 'posts') && r.posts.length > 0 && (
                <section><h2 className="mb-2 text-sm font-semibold">{t('search.tabs.posts')}</h2><div className="grid grid-cols-3 gap-0.5">{r.posts.map((p) => <PostGridTile key={p.id} post={p} />)}</div></section>
              )}
            </div>
          )}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={t('search.filters')} footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDraft({ type: filters.type, sort: 'relevance' })}>{t('search.reset')}</Button>
          <Button className="flex-1" onClick={() => { update({ category: draft.category ?? null, country: draft.country ?? null, verified: draft.verifiedOnly ? '1' : null, sort: draft.sort === 'relevance' ? null : draft.sort ?? null }); setOpen(false); }}>{t('search.apply')}</Button>
        </div>
      }>
        <div className="space-y-5">
          <Field label={t('search.category')}>{(p) => (
            <Select {...p} value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.currentTarget.value || null })}>
              <option value="">{t('categories.all')}</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(`categories.${c.slug}` as TKey)}</option>)}
            </Select>
          )}</Field>
          <Field label={t('search.country')}>{(p) => (
            <div className="flex gap-2"><CountrySelector {...p} className="flex-1" value={draft.country ?? 'TR'} onChange={(c) => setDraft({ ...draft, country: c })} />
              {draft.country && <Button variant="ghost" onClick={() => setDraft({ ...draft, country: null })}>{t('search.any')}</Button>}</div>
          )}</Field>
          <div>
            <p className="mb-2 text-sm font-medium">{t('search.sort')}</p>
            <Segmented label={t('search.sort')} value={draft.sort ?? 'relevance'} onChange={(v) => setDraft({ ...draft, sort: v })} options={[{ value: 'relevance', label: t('search.sortRelevance') }, { value: 'recent', label: t('search.sortRecent') }, { value: 'popular', label: t('search.sortPopular') }]} size="sm" />
          </div>
          <Switch checked={!!draft.verifiedOnly} onCheckedChange={(v) => setDraft({ ...draft, verifiedOnly: v })} label={t('search.verifiedOnly')} />
        </div>
      </Modal>
    </div>
  );
}
