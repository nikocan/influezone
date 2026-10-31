import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import type { FeedQuery, Post, SearchFilters } from './types';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/i18n/I18nProvider';
import { errorCode } from './errors';
import { useAuthPrompt } from '@/components/common/AuthPrompt';

export const qk = {
  profile: (id: string) => ['profile', id] as const,
  profileByUsername: (u: string) => ['profile', 'u', u] as const,
  profiles: (ids: string[]) => ['profiles', [...ids].sort().join(',')] as const,
  feed: (q: FeedQuery) => ['feed', q.mode, q.category ?? null] as const,
  post: (id: string) => ['post', id] as const,
  following: ['me', 'following'] as const,
  liked: ['me', 'liked'] as const,
  blocked: ['me', 'blocked'] as const,
  muted: ['me', 'muted'] as const,
  collections: ['me', 'collections'] as const,
  notifications: ['me', 'notifications'] as const,
  conversations: ['me', 'conversations'] as const,
  priceAlerts: ['me', 'priceAlerts'] as const,
  drafts: ['me', 'drafts'] as const,
};

export function useErrorToast() {
  const toast = useToast();
  const { t } = useI18n();
  return (e: unknown) => {
    const code = errorCode(e);
    toast({ variant: 'error', title: t(`errors.${code}` as 'errors.unknown') });
  };
}

/** Wraps an action so guests are asked to sign in instead of hitting an error. */
export function useRequireAuth() {
  const { session } = useAuth();
  const prompt = useAuthPrompt();
  return <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      if (!session) return prompt.open();
      fn(...a);
    };
}

export function useProfile(id: string | null | undefined) {
  const repo = useRepo();
  return useQuery({ queryKey: qk.profile(id ?? ''), queryFn: () => repo.getProfile(id!), enabled: !!id, staleTime: 30_000 });
}

export function useProfileByUsername(username: string | undefined) {
  const repo = useRepo();
  return useQuery({ queryKey: qk.profileByUsername(username ?? ''), queryFn: () => repo.getProfileByUsername(username!), enabled: !!username });
}

export function useProfilesMap(ids: string[]) {
  const repo = useRepo();
  const unique = [...new Set(ids)].filter(Boolean);
  return useQuery({
    queryKey: qk.profiles(unique),
    queryFn: async () => new Map((await repo.getProfiles(unique)).map((p) => [p.id, p])),
    enabled: unique.length > 0,
    staleTime: 30_000,
  });
}

export function useFeed(q: FeedQuery) {
  const repo = useRepo();
  const { session } = useAuth();
  return useQuery({ queryKey: [...qk.feed(q), session?.userId ?? 'guest'], queryFn: () => repo.getFeed({ ...q, limit: 30 }) });
}

export function usePost(id: string | undefined) {
  const repo = useRepo();
  return useQuery({ queryKey: qk.post(id ?? ''), queryFn: () => repo.getPost(id!), enabled: !!id });
}

function useIdSet(key: QueryKey, fn: () => Promise<string[]>) {
  const { session } = useAuth();
  return useQuery({ queryKey: [...key, session?.userId ?? 'guest'], queryFn: async () => new Set(await fn()), staleTime: 60_000 });
}

export function useFollowingSet() {
  const repo = useRepo();
  return useIdSet(qk.following, () => repo.getFollowingIds());
}
export function useLikedSet() {
  const repo = useRepo();
  return useIdSet(qk.liked, () => repo.getLikedPostIds());
}
export function useBlockedSet() {
  const repo = useRepo();
  return useIdSet(qk.blocked, () => repo.getBlockedIds());
}
export function useMutedSet() {
  const repo = useRepo();
  return useIdSet(qk.muted, () => repo.getMutedIds());
}

/** Optimistic follow toggle. */
export function useFollowToggle() {
  const repo = useRepo();
  const qc = useQueryClient();
  const { session } = useAuth();
  const onError = useErrorToast();
  const key = [...qk.following, session?.userId ?? 'guest'];
  return useMutation({
    mutationFn: async ({ id, follow }: { id: string; follow: boolean }) => (follow ? repo.follow(id) : repo.unfollow(id)),
    onMutate: async ({ id, follow }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev);
      if (follow) next.add(id);
      else next.delete(id);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      onError(e);
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: qk.profile(v.id) });
      qc.invalidateQueries({ queryKey: ['feed', 'following'] });
      qc.invalidateQueries({ queryKey: ['followers'] });
    },
  });
}

function patchPostEverywhere(qc: ReturnType<typeof useQueryClient>, postId: string, fn: (p: Post) => Post) {
  qc.setQueriesData<Post[]>({ queryKey: ['feed'] }, (old) => old?.map((p) => (p.id === postId ? fn(p) : p)));
  qc.setQueriesData<Post[]>({ queryKey: ['posts'] }, (old) => (Array.isArray(old) ? old.map((p) => (p.id === postId ? fn(p) : p)) : old));
  qc.setQueryData<Post | null>(qk.post(postId), (old) => (old ? fn(old) : old));
}

export function useLikeToggle() {
  const repo = useRepo();
  const qc = useQueryClient();
  const { session } = useAuth();
  const onError = useErrorToast();
  const key = [...qk.liked, session?.userId ?? 'guest'];
  return useMutation({
    mutationFn: async ({ postId, like }: { postId: string; like: boolean }) => (like ? repo.like(postId) : repo.unlike(postId)),
    onMutate: async ({ postId, like }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev);
      if (like) next.add(postId);
      else next.delete(postId);
      qc.setQueryData(key, next);
      patchPostEverywhere(qc, postId, (p) => ({ ...p, likeCount: Math.max(0, p.likeCount + (like ? 1 : -1)) }));
      return { prev, like };
    },
    onError: (e, v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      patchPostEverywhere(qc, v.postId, (p) => ({ ...p, likeCount: Math.max(0, p.likeCount + (v.like ? -1 : 1)) }));
      onError(e);
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: ['likers', v.postId] }),
  });
}

export function useCollections() {
  const repo = useRepo();
  const { session } = useAuth();
  return useQuery({ queryKey: [...qk.collections, session?.userId ?? 'guest'], queryFn: () => repo.listCollections(), enabled: !!session });
}

export function useSavedPostIds() {
  const { data } = useCollections();
  const set = new Set<string>();
  for (const c of data ?? []) for (const i of c.items) if (i.kind === 'post') set.add(i.refId);
  return set;
}

export function useNotifications() {
  const repo = useRepo();
  const { session } = useAuth();
  return useQuery({ queryKey: [...qk.notifications, session?.userId ?? 'guest'], queryFn: () => repo.listNotifications(), enabled: !!session, refetchInterval: 30_000 });
}

export function useConversations() {
  const repo = useRepo();
  const { session } = useAuth();
  return useQuery({ queryKey: [...qk.conversations, session?.userId ?? 'guest'], queryFn: () => repo.listConversations(), enabled: !!session, refetchInterval: 15_000 });
}

export function useSearch(q: string, filters: SearchFilters) {
  const repo = useRepo();
  return useQuery({ queryKey: ['search', q, filters], queryFn: () => repo.search(q, filters), enabled: q.trim().length > 0 || !!filters.category });
}

export function useProducts(ids: string[]) {
  const repo = useRepo();
  const unique = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ['products', unique.join(',')],
    queryFn: async () => new Map((await repo.getProducts(unique)).map((p) => [p.id, p])),
    enabled: unique.length > 0,
    staleTime: 60_000,
  });
}
