import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Lock, MoreHorizontal, Plus, Send, Share2, Trash2, Flag } from 'lucide-react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Field } from '@/components/ui/input';
import { Switch } from '@/components/ui/misc';
import { Menu, MenuItem } from '@/components/ui/menu';
import { useToast } from '@/components/ui/toast';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { qk, useCollections, useErrorToast, useProfilesMap, useRequireAuth, usePost, useFollowingSet } from '@/data/hooks';
import type { Comment, Post, ReportReason, ReportTarget } from '@/data/types';
import { FollowButton } from './FollowButton';
import { RichText } from './RichText';
import { ProductSheet } from '@/components/commerce/ProductSheet';
import { cn } from '@/lib/utils';

type SheetState =
  | { kind: 'comments'; postId: string }
  | { kind: 'likes'; postId: string }
  | { kind: 'share'; post: Post }
  | { kind: 'save'; itemKind: 'post' | 'product'; refId: string }
  | { kind: 'report'; targetType: ReportTarget; targetId: string; profileId?: string }
  | { kind: 'product'; productId: string; postId: string | null; creatorId: string | null }
  | null;

interface SheetsApi {
  openComments: (postId: string) => void;
  openLikes: (postId: string) => void;
  openShare: (post: Post) => void;
  openSave: (kind: 'post' | 'product', refId: string) => void;
  openReport: (targetType: ReportTarget, targetId: string, profileId?: string) => void;
  openProduct: (productId: string, ctx?: { postId?: string | null; creatorId?: string | null }) => void;
}

const Ctx = createContext<SheetsApi | null>(null);
export const useSheets = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('SheetsProvider missing');
  return c;
};

/** Hosts every app-wide bottom sheet so any screen can open them consistently. */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>(null);
  const api = useMemo<SheetsApi>(() => ({
    openComments: (postId) => setState({ kind: 'comments', postId }),
    openLikes: (postId) => setState({ kind: 'likes', postId }),
    openShare: (post) => setState({ kind: 'share', post }),
    openSave: (itemKind, refId) => setState({ kind: 'save', itemKind, refId }),
    openReport: (targetType, targetId, profileId) => setState({ kind: 'report', targetType, targetId, profileId }),
    openProduct: (productId, ctx) => setState({ kind: 'product', productId, postId: ctx?.postId ?? null, creatorId: ctx?.creatorId ?? null }),
  }), []);
  const close = (o: boolean) => { if (!o) setState(null); };
  return (
    <Ctx.Provider value={api}>
      {children}
      {state?.kind === 'comments' && <CommentsPanel postId={state.postId} onOpenChange={close} />}
      {state?.kind === 'likes' && <LikesPanel postId={state.postId} onOpenChange={close} />}
      {state?.kind === 'share' && <ShareSheet post={state.post} onOpenChange={close} />}
      {state?.kind === 'save' && <SaveToCollectionSheet itemKind={state.itemKind} refId={state.refId} onOpenChange={close} />}
      {state?.kind === 'report' && <ReportDialog targetType={state.targetType} targetId={state.targetId} profileId={state.profileId} onOpenChange={close} />}
      {state?.kind === 'product' && <ProductSheet productId={state.productId} postId={state.postId} creatorId={state.creatorId} onOpenChange={close} />}
    </Ctx.Provider>
  );
}

// ---------------------------------------------------------------------------
export function CommentsPanel({ postId, onOpenChange }: { postId: string; onOpenChange: (o: boolean) => void }) {
  const { t, relative } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const { session, profile } = useAuth();
  const guard = useRequireAuth();
  const onError = useErrorToast();
  const sheets = useSheets();
  const { data: post } = usePost(postId);
  const comments = useQuery({ queryKey: ['comments', postId], queryFn: () => repo.listComments(postId) });
  const authors = useProfilesMap((comments.data ?? []).map((c) => c.authorId));
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const add = useMutation({
    mutationFn: () => repo.addComment(postId, body, replyTo ? replyTo.parentId ?? replyTo.id : null),
    onSuccess: () => {
      setBody('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.setQueriesData<Post[]>({ queryKey: ['feed'] }, (old) => old?.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
      qc.invalidateQueries({ queryKey: qk.post(postId) });
    },
    onError,
  });
  const del = useMutation({
    mutationFn: (id: string) => repo.deleteComment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', postId] }); qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: qk.post(postId) }); },
    onError,
  });
  const roots = (comments.data ?? []).filter((c) => !c.parentId);
  const replies = (id: string) => (comments.data ?? []).filter((c) => c.parentId === id);
  const isPostOwner = post?.authorId === session?.userId;

  const row = (c: Comment, nested = false) => {
    const a = authors.data?.get(c.authorId);
    const canDelete = c.authorId === session?.userId || isPostOwner;
    return (
      <li key={c.id} className={cn('flex gap-3', nested && 'ms-11')}>
        <Link to={a ? `/@${a.username}` : '#'} onClick={() => onOpenChange(false)}><CreatorAvatar profile={a} size={nested ? 'xs' : 'sm'} /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link to={a ? `/@${a.username}` : '#'} onClick={() => onOpenChange(false)} className="me-1.5 font-semibold">{a?.username ?? '…'}</Link>
            {a?.verified && <VerifiedBadge className="me-1 h-3.5 w-3.5" />}
            <RichText text={c.body} onNavigate={() => onOpenChange(false)} />
          </p>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted">
            <time dateTime={c.createdAt}>{relative(c.createdAt)}</time>
            <button type="button" className="min-h-[32px] font-semibold" onClick={guard(() => { setReplyTo(c); setBody(a ? `@${a.username} ` : ''); })}>{t('social.reply')}</button>
          </div>
        </div>
        {session && (
          <Menu trigger={<button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface" aria-label={t('common.more')}><MoreHorizontal className="h-4 w-4" /></button>}>
            {canDelete && <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onSelect={() => del.mutate(c.id)}>{t('common.delete')}</MenuItem>}
            {c.authorId !== session.userId && <MenuItem icon={<Flag className="h-4 w-4" />} onSelect={() => sheets.openReport('comment', c.id)}>{t('report.report')}</MenuItem>}
          </Menu>
        )}
      </li>
    );
  };

  return (
    <Modal open onOpenChange={onOpenChange} title={t('social.comments')} footer={
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) guard(() => add.mutate())(); }}>
        <CreatorAvatar profile={profile} size="sm" />
        <div className="min-w-0 flex-1">
          {replyTo && (
            <p className="mb-1 flex items-center gap-2 text-xs text-muted">{t('social.replyingTo', { name: authors.data?.get(replyTo.authorId)?.username ?? '' })}
              <button type="button" className="font-semibold text-fg" onClick={() => { setReplyTo(null); setBody(''); }}>{t('common.cancel')}</button></p>
          )}
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder={session ? t('social.addComment') : t('auth.signInToComment')} maxLength={1000} aria-label={t('social.addComment')} onFocus={() => { if (!session) guard(() => {})(); }} />
        </div>
        <Button type="submit" size="icon" variant="ghost" disabled={!body.trim()} loading={add.isPending} aria-label={t('social.post')}><Send className="h-5 w-5 text-primary" /></Button>
      </form>
    }>
      {comments.isLoading ? <ListSkeleton rows={4} /> : comments.isError ? <ErrorState error={comments.error} onRetry={() => comments.refetch()} /> : roots.length === 0 ? (
        <EmptyState title={t('social.noComments')} description={t('social.beFirst')} />
      ) : (
        <ul className="space-y-5">{roots.map((c) => [row(c), ...replies(c.id).map((r) => row(r, true))])}</ul>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
export function LikesPanel({ postId, onOpenChange }: { postId: string; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const likers = useQuery({ queryKey: ['likers', postId], queryFn: () => repo.listLikers(postId) });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('social.likes')}>
      {likers.isLoading ? <ListSkeleton /> : likers.isError ? <ErrorState error={likers.error} onRetry={() => likers.refetch()} /> : !likers.data?.length ? (
        <EmptyState title={t('social.noLikers')} description={t('social.noLikersDesc')} />
      ) : (
        <ul className="space-y-3">
          {likers.data.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Link to={`/@${p.username}`} onClick={() => onOpenChange(false)} className="flex min-w-0 flex-1 items-center gap-3">
                <CreatorAvatar profile={p} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.username}</span><span className="block truncate text-xs text-muted">{p.displayName}</span></span>
              </Link>
              <FollowButton profileId={p.id} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
export function ShareSheet({ post, onOpenChange }: { post: Post; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const toast = useToast();
  const { session } = useAuth();
  const guard = useRequireAuth();
  const onError = useErrorToast();
  const url = `${location.origin}/p/${post.id}`;
  const { data: following } = useFollowingSet();
  const people = useProfilesMap([...(following ?? [])].slice(0, 12));
  const [sent, setSent] = useState<Set<string>>(new Set());
  const record = () => repo.recordShare(post.id).catch(() => {});
  const send = useMutation({
    mutationFn: async (profileId: string) => {
      const conv = await repo.startConversation(profileId, 'personal');
      await repo.sendMessage(conv.id, url);
      return profileId;
    },
    onSuccess: (id) => { setSent((s) => new Set(s).add(id)); record(); },
    onError,
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ variant: 'success', title: t('share.copied') }); record(); }
    catch { toast({ variant: 'error', title: t('share.copyFailed'), description: url }); }
  };
  const native = async () => {
    try { await navigator.share({ url, title: 'Shopfluence' }); record(); } catch { /* cancelled */ }
  };
  return (
    <Modal open onOpenChange={onOpenChange} title={t('social.share')}>
      {session && (people.data?.size ?? 0) > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('share.sendTo')}</p>
          <ul className="scrollbar-none flex gap-4 overflow-x-auto pb-1">
            {[...(people.data?.values() ?? [])].map((p) => (
              <li key={p.id} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <button type="button" onClick={() => send.mutate(p.id)} disabled={sent.has(p.id)} className="relative" aria-label={t('share.sendToName', { name: p.username })}>
                  <CreatorAvatar profile={p} size="lg" />
                  {sent.has(p.id) && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white"><Check className="h-6 w-6" /></span>}
                </button>
                <span className="w-full truncate text-center text-xs">{p.username}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copy}><Copy className="h-4 w-4" />{t('share.copyLink')}</Button>
        {'share' in navigator ? <Button variant="secondary" onClick={native}><Share2 className="h-4 w-4" />{t('share.more')}</Button> : (
          <Button variant="secondary" onClick={guard(() => {})} asChild><Link to="/messages" onClick={() => onOpenChange(false)}><Send className="h-4 w-4" />{t('share.viaDm')}</Link></Button>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
export function SaveToCollectionSheet({ itemKind, refId, onOpenChange }: { itemKind: 'post' | 'product'; refId: string; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const toast = useToast();
  const cols = useCollections();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const invalidate = () => { qc.invalidateQueries({ queryKey: qk.collections }); qc.invalidateQueries({ queryKey: ['feed'] }); };
  const toggle = useMutation({
    mutationFn: async ({ id, add }: { id: string; add: boolean }) => (add ? repo.addToCollection(id, itemKind, refId) : repo.removeFromCollection(id, itemKind, refId)),
    onSuccess: (_d, v) => { invalidate(); if (v.add) toast({ variant: 'success', title: t('collections.savedTo') }); },
    onError,
  });
  const create = useMutation({
    mutationFn: async () => {
      const c = await repo.createCollection(name || t('collections.defaultName'), isPrivate);
      await repo.addToCollection(c.id, itemKind, refId);
    },
    onSuccess: () => { setCreating(false); setName(''); invalidate(); toast({ variant: 'success', title: t('collections.savedTo') }); },
    onError,
  });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('collections.saveTo')}>
      {cols.isLoading ? <ListSkeleton rows={3} /> : (
        <ul className="space-y-1">
          {(cols.data ?? []).map((c) => {
            const has = c.items.some((i) => i.kind === itemKind && i.refId === refId);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => toggle.mutate({ id: c.id, add: !has })} aria-pressed={has} className="flex min-h-[52px] w-full items-center gap-3 rounded-sm px-2 text-start hover:bg-surface">
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface">{c.isPrivate ? <Lock className="h-4 w-4 text-muted" /> : <span className="text-xs font-bold text-muted">{c.items.length}</span>}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.name}</span><span className="text-xs text-muted">{t('collections.items', { n: c.items.length })}</span></span>
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2', has ? 'border-primary bg-primary text-white' : 'border-line')}>{has && <Check className="h-4 w-4" />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {creating ? (
        <form className="mt-4 space-y-3 rounded-md border border-line p-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label={t('collections.name')}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t('collections.defaultName')} autoFocus />}</Field>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} label={t('collections.private')} description={t('collections.privateDesc')} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCreating(false)}>{t('common.cancel')}</Button><Button type="submit" loading={create.isPending}>{t('collections.createAndSave')}</Button></div>
        </form>
      ) : (
        <Button variant="secondary" block className="mt-4" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t('collections.new')}</Button>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
const REASONS: ReportReason[] = ['spam', 'harassment', 'misleading', 'undisclosed_ad', 'counterfeit', 'ip', 'nudity', 'violence', 'other'];

export function ReportDialog({ targetType, targetId, profileId, onOpenChange }: { targetType: ReportTarget; targetId: string; profileId?: string; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);
  const submit = useMutation({ mutationFn: () => repo.report(targetType, targetId, reason!, details), onSuccess: () => setDone(true), onError });
  const block = useMutation({
    mutationFn: () => repo.block(profileId!),
    onSuccess: () => { qc.invalidateQueries(); toast({ variant: 'success', title: t('report.blocked') }); onOpenChange(false); },
    onError,
  });
  const mute = useMutation({
    mutationFn: () => repo.mute(profileId!),
    onSuccess: () => { qc.invalidateQueries(); toast({ variant: 'success', title: t('report.muted') }); onOpenChange(false); },
    onError,
  });
  return (
    <Modal open onOpenChange={onOpenChange} title={t('report.title')} description={done ? undefined : t('report.desc')}>
      {done ? (
        <div className="space-y-4 py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-7 w-7" /></div>
          <p className="font-semibold">{t('report.thanks')}</p>
          <p className="text-sm text-muted">{t('report.thanksDesc')}</p>
          {profileId && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="secondary" onClick={() => mute.mutate()} loading={mute.isPending}>{t('report.mute')}</Button>
              <Button variant="danger" onClick={() => block.mutate()} loading={block.isPending}>{t('report.block')}</Button>
            </div>
          )}
          <Button variant="ghost" block onClick={() => onOpenChange(false)}>{t('common.done')}</Button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (reason) submit.mutate(); }} className="space-y-4">
          <fieldset>
            <legend className="sr-only">{t('report.reason')}</legend>
            <div className="space-y-1">
              {REASONS.map((r) => (
                <label key={r} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-sm px-2 hover:bg-surface">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-[#7047EB]" />
                  <span className="text-sm">{t(`report.reasons.${r}` as TKey)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t('report.details')} hint={t('report.detailsHint')}>{(p) => <Textarea {...p} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />}</Field>
          <Button type="submit" block disabled={!reason} loading={submit.isPending}>{t('report.submit')}</Button>
        </form>
      )}
    </Modal>
  );
}
