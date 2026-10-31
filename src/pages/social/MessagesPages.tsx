import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Briefcase, Inbox, Flag, PenSquare } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { qk, useConversations, useErrorToast, useFollowingSet, useProfilesMap } from '@/data/hooks';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { CreatorAvatar, VerifiedBadge } from '@/components/common/CreatorAvatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { Segmented, Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { useSheets } from '@/components/social/Sheets';
import type { Conversation, Message, Profile } from '@/data/types';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/social/RichText';

type Box = 'personal' | 'collaboration' | 'requests';

export function ConversationList({ items, profiles, me }: { items: Conversation[]; profiles?: Map<string, Profile>; me: string }) {
  const { t, relative } = useI18n();
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => {
        const other = profiles?.get(c.participantIds.find((p) => p !== me) ?? '');
        return (
          <li key={c.id}>
            <Link to={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
              <CreatorAvatar profile={other} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold"><span className="truncate">{other?.displayName ?? '…'}</span>{other?.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  {c.kind === 'collaboration' && <Badge tone="gold" className="ms-1">{t('messages.collab')}</Badge>}</span>
                <span className={cn('block truncate text-sm', c.unreadCount ? 'font-semibold text-fg' : 'text-muted')}>{c.lastMessagePreview || t('messages.noMessagesYet')} · {relative(c.lastMessageAt)}</span>
              </span>
              {c.unreadCount > 0 && <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-label={t('messages.unread')} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function InboxPage() {
  const { t } = useI18n();
  const { session } = useAuth();
  const convs = useConversations();
  const [box, setBox] = useState<Box>('personal');
  const [compose, setCompose] = useState(false);
  const all = convs.data ?? [];
  const profiles = useProfilesMap(all.flatMap((c) => c.participantIds));
  const list = all.filter((c) => (box === 'requests' ? c.status === 'request' : c.status === 'active' && c.kind === box));
  const requests = all.filter((c) => c.status === 'request').length;
  return (
    <div className="mx-auto max-w-[620px]">
      <TopNavigation title={t('nav.messages')} back={false} actions={<Button variant="ghost" size="icon" onClick={() => setCompose(true)} aria-label={t('messages.new')}><PenSquare className="h-5 w-5" /></Button>}>
        <div className="px-4 pb-3">
          <Segmented<Box> label={t('nav.messages')} value={box} onChange={setBox} size="sm" options={[
            { value: 'personal', label: t('messages.personal') },
            { value: 'collaboration', label: t('messages.collabs') },
            { value: 'requests', label: requests ? `${t('messages.requests')} (${requests})` : t('messages.requests') },
          ]} />
        </div>
      </TopNavigation>
      {convs.isLoading ? <div className="p-4"><ListSkeleton /></div> : convs.isError ? <ErrorState error={convs.error} onRetry={() => convs.refetch()} /> : list.length === 0 ? (
        <EmptyState icon={box === 'collaboration' ? <Briefcase /> : box === 'requests' ? <Inbox /> : <MessageCircle />} title={t(`messages.empty.${box}`)} description={t(`messages.emptyDesc.${box}`)}
          action={box === 'personal' ? <Button onClick={() => setCompose(true)}>{t('messages.new')}</Button> : undefined} />
      ) : <ConversationList items={list} profiles={profiles.data} me={session!.userId} />}
      {compose && <ComposeSheet onOpenChange={setCompose} />}
    </div>
  );
}

function ComposeSheet({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const nav = useNavigate();
  const onError = useErrorToast();
  const [q, setQ] = useState('');
  const { data: following } = useFollowingSet();
  const followed = useProfilesMap([...(following ?? [])]);
  const search = useQuery({ queryKey: ['search', 'dm', q], queryFn: () => repo.search(q, { type: 'all' }), enabled: q.trim().length > 1 });
  const start = useMutation({ mutationFn: (p: Profile) => repo.startConversation(p.id, p.kind === 'brand' ? 'collaboration' : 'personal'), onSuccess: (c) => { onOpenChange(false); nav(`/messages/${c.id}`); }, onError });
  const people = q.trim().length > 1 ? [...(search.data?.creators ?? []), ...(search.data?.brands ?? [])] : [...(followed.data?.values() ?? [])];
  return (
    <Modal open onOpenChange={onOpenChange} title={t('messages.new')}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('messages.searchPeople')} aria-label={t('messages.searchPeople')} autoFocus />
      <ul className="mt-3 space-y-1">
        {people.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => start.mutate(p)} className="flex min-h-[52px] w-full items-center gap-3 rounded-sm px-2 text-start hover:bg-surface">
              <CreatorAvatar profile={p} size="sm" />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.displayName}</span><span className="block truncate text-xs text-muted">@{p.username}</span></span>
            </button>
          </li>
        ))}
        {people.length === 0 && <p className="py-6 text-center text-sm text-muted">{t('messages.searchHint')}</p>}
      </ul>
    </Modal>
  );
}

export function MessageThread({ messages, me, profiles }: { messages: Message[]; me: string; profiles?: Map<string, Profile> }) {
  const { date } = useI18n();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  return (
    <ol className="flex flex-col gap-1.5 p-4" aria-live="polite">
      {messages.map((m, i) => {
        const mine = m.senderId === me;
        const showAvatar = !mine && messages[i + 1]?.senderId !== m.senderId;
        return (
          <li key={m.id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
            {!mine && <span className="w-7">{showAvatar && <CreatorAvatar profile={profiles?.get(m.senderId)} size="xs" />}</span>}
            <div className={cn('max-w-[75%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-sm', mine ? 'rounded-ee-sm bg-primary text-white [&_a]:text-white [&_a]:underline' : 'rounded-es-sm bg-surface')} title={date(m.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}>
              <RichText text={m.body} />
            </div>
          </li>
        );
      })}
      <div ref={end} />
    </ol>
  );
}

export function ConversationPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const repo = useRepo();
  const qc = useQueryClient();
  const sheets = useSheets();
  const { session } = useAuth();
  const onError = useErrorToast();
  const conv = useQuery({ queryKey: ['conversation', id], queryFn: () => repo.getConversation(id) });
  const msgs = useQuery({ queryKey: ['messages', id], queryFn: () => repo.listMessages(id), refetchInterval: 5000, enabled: !!conv.data });
  const otherId = conv.data?.participantIds.find((p) => p !== session?.userId);
  const profiles = useProfilesMap(conv.data?.participantIds ?? []);
  const other = profiles.data?.get(otherId ?? '');
  const [body, setBody] = useState('');
  useEffect(() => { if (msgs.isSuccess) qc.invalidateQueries({ queryKey: qk.conversations }); }, [msgs.isSuccess, msgs.dataUpdatedAt, qc]);
  const send = useMutation({
    mutationFn: () => repo.sendMessage(id, body),
    onSuccess: () => { setBody(''); qc.invalidateQueries({ queryKey: ['messages', id] }); qc.invalidateQueries({ queryKey: ['conversation', id] }); },
    onError,
  });
  const accept = useMutation({ mutationFn: () => repo.acceptConversation(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation', id] }) });
  const isIncomingRequest = conv.data?.status === 'request';

  if (conv.isLoading) return <div className="p-4"><ListSkeleton rows={3} /></div>;
  if (conv.isError || !conv.data) return <><TopNavigation title={t('nav.messages')} /><ErrorState error={conv.error} /></>;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[620px] flex-col">
      <TopNavigation title={
        <Link to={other ? `/@${other.username}` : '#'} className="flex items-center gap-2"><CreatorAvatar profile={other} size="xs" /><span className="truncate">{other?.displayName}</span>{conv.data.kind === 'collaboration' && <Badge tone="gold">{t('messages.collab')}</Badge>}</Link>
      } actions={otherId && <Button variant="ghost" size="icon" onClick={() => sheets.openReport('profile', otherId, otherId)} aria-label={t('report.report')}><Flag className="h-5 w-5" /></Button>} />
      <div className="flex-1">
        {conv.data.kind === 'collaboration' && <p className="mx-4 mt-3 rounded-sm bg-gold/10 p-2 text-xs text-muted">{t('messages.collabNote')}</p>}
        {msgs.isLoading ? <div className="p-4"><ListSkeleton rows={3} /></div> : !msgs.data?.length ? <EmptyState title={t('messages.startTitle')} description={t('messages.startDesc')} /> : <MessageThread messages={msgs.data} me={session!.userId} profiles={profiles.data} />}
      </div>
      {isIncomingRequest && (
        <div className="sticky bottom-[64px] border-t border-line bg-bg p-3 text-center text-sm">
          <p className="mb-2 text-muted">{t('messages.requestNote', { name: other?.displayName ?? '' })}</p>
          <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => otherId && sheets.openReport('profile', otherId, otherId)}>{t('report.blockOrMute')}</Button><Button className="flex-1" onClick={() => accept.mutate()}>{t('messages.accept')}</Button></div>
        </div>
      )}
      <form className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg p-3 pb-safe" onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(); }}>
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('messages.placeholder')} aria-label={t('messages.placeholder')} maxLength={2000} className="rounded-full" />
        <Button type="submit" size="icon" disabled={!body.trim()} loading={send.isPending} aria-label={t('messages.send')}><Send className="h-5 w-5" /></Button>
      </form>
    </div>
  );
}
