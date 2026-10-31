import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, MessageCircle, Bookmark, Send, PlusSquare, FilePen, CalendarClock, Trash2, Wallet, Info } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { qk, useErrorToast } from '@/data/hooks';
import { Card, Badge, Switch } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { EmptyState, ListSkeleton } from '@/components/common/States';
import { PostGridTile } from '@/components/social/PostCard';
import { SmartImage } from '@/components/common/SmartImage';
import { useToast } from '@/components/ui/toast';
import type { Post } from '@/data/types';

function useMyPosts() {
  const repo = useRepo();
  const { session } = useAuth();
  return useQuery({ queryKey: ['posts', 'author', session?.userId], queryFn: () => repo.listPostsByAuthor(session!.userId), enabled: !!session });
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </Card>
  );
}

/** Creator Studio overview — only shows metrics that are actually recorded (no estimates, no earnings yet). */
export function StudioDashboard() {
  const { t, num } = useI18n();
  const { profile } = useAuth();
  const posts = useMyPosts();
  const ps = posts.data ?? [];
  const sum = (k: keyof Pick<Post, 'viewCount' | 'likeCount' | 'commentCount' | 'saveCount' | 'shareCount'>) => ps.reduce((s, p) => s + p[k], 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t('studio.hello', { name: profile?.displayName ?? '' })}</h1><p className="text-sm text-muted">{t('studio.subtitle')}</p></div>
        <Button asChild><Link to="/create"><PlusSquare className="h-4 w-4" />{t('nav.create')}</Link></Button>
      </div>
      {!profile?.isCreator && (
        <Card className="flex flex-wrap items-center gap-3 border-primary/40 p-4"><Info className="h-5 w-5 text-primary" /><p className="flex-1 text-sm">{t('studio.notCreator')}</p><Button asChild size="sm"><Link to="/onboarding/creator">{t('studio.becomeCreator')}</Link></Button></Card>
      )}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{t('studio.engagement')}</h2>
        {posts.isLoading ? <ListSkeleton rows={2} /> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat icon={<Eye />} label={t('studio.views')} value={num(sum('viewCount'))} />
            <Stat icon={<Heart />} label={t('studio.likes')} value={num(sum('likeCount'))} />
            <Stat icon={<MessageCircle />} label={t('studio.comments')} value={num(sum('commentCount'))} />
            <Stat icon={<Bookmark />} label={t('studio.saves')} value={num(sum('saveCount'))} />
            <Stat icon={<Send />} label={t('studio.shares')} value={num(sum('shareCount'))} />
          </div>
        )}
      </section>
      <Card className="p-4">
        <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-gold" /><h2 className="font-semibold">{t('studio.earningsTitle')}</h2><Badge tone="warning">{t('status.phase', { n: 4 })}</Badge></div>
        <p className="mt-2 text-sm text-muted">{t('studio.earningsNotYet')}</p>
      </Card>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('studio.recent')}</h2><Link to="/studio/content" className="text-sm font-semibold text-primary">{t('common.seeAll')}</Link></div>
        {!ps.length ? <EmptyState title={t('profile.noPosts')} action={<Button asChild><Link to="/create">{t('profile.createFirst')}</Link></Button>} /> : <div className="grid grid-cols-3 gap-1 md:grid-cols-6">{ps.slice(0, 6).map((p) => <PostGridTile key={p.id} post={p} />)}</div>}
      </section>
    </div>
  );
}

export function ContentLibraryPage() {
  const { t } = useI18n();
  const posts = useMyPosts();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('screens.contentLibrary')}</h1>
      {posts.isLoading ? <ListSkeleton /> : !posts.data?.length ? <EmptyState title={t('profile.noPosts')} action={<Button asChild><Link to="/create">{t('profile.createFirst')}</Link></Button>} /> : (
        <div className="grid grid-cols-3 gap-1 md:grid-cols-5">{posts.data.map((p) => <PostGridTile key={p.id} post={p} />)}</div>
      )}
    </div>
  );
}

export function DraftsPage({ kind }: { kind: 'draft' | 'scheduled' }) {
  const { t, date } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const q = useQuery({ queryKey: qk.drafts, queryFn: () => repo.listMyDrafts() });
  const del = useMutation({ mutationFn: (id: string) => repo.deletePost(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.drafts }), onError });
  const items = (q.data ?? []).filter((p) => p.status === kind);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{kind === 'draft' ? t('screens.drafts') : t('screens.scheduled')}</h1>
      {kind === 'scheduled' && <p className="mb-4 text-sm text-muted">{t('create.schedulerNote')}</p>}
      {q.isLoading ? <ListSkeleton /> : !items.length ? (
        <EmptyState icon={kind === 'draft' ? <FilePen /> : <CalendarClock />} title={kind === 'draft' ? t('studio.noDrafts') : t('studio.noScheduled')} action={<Button asChild><Link to="/create">{t('nav.create')}</Link></Button>} />
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}><Card className="flex items-center gap-3 p-3">
              <SmartImage src={p.media[0]?.type === 'video' ? p.media[0].posterUrl ?? undefined : p.media[0]?.url} alt="" className="h-16 w-14 rounded-sm object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.caption || t('studio.untitled')}</p><p className="text-xs text-muted">{p.scheduledAt ? t('studio.scheduledFor', { when: date(p.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' }) }) : date(p.createdAt)}</p></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)} aria-label={t('common.delete')}><Trash2 className="h-5 w-5" /></Button>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CreatorSettingsPage() {
  const { t } = useI18n();
  const { profile, repo, refreshProfile } = useAuth();
  const toast = useToast();
  const onError = useErrorToast();
  const set = useMutation({ mutationFn: (v: boolean) => repo.updateMyProfile({ isCreator: v }), onSuccess: async () => { await refreshProfile(); toast({ variant: 'success', title: t('settings.saved') }); }, onError });
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t('screens.creatorSettings')}</h1>
      <Card className="p-4"><Switch checked={!!profile?.isCreator} onCheckedChange={(v) => set.mutate(v)} label={t('studio.creatorMode')} description={t('studio.creatorModeDesc')} /></Card>
      <Card className="p-4 text-sm"><p className="font-semibold">{t('studio.verification')}</p><p className="mt-1 text-muted">{t('studio.verificationDesc')}</p></Card>
      <Button asChild variant="secondary"><Link to="/settings/profile">{t('settings.editProfile')}</Link></Button>
    </div>
  );
}
