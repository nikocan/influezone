import type { Repository } from '../repository';
import type {
  AppNotification,
  ClickEvent,
  Collection,
  Comment,
  Conversation,
  FeedQuery,
  Message,
  ModerationReport,
  NewPostInput,
  Post,
  PriceAlert,
  Product,
  ProductProposal,
  Profile,
  ProfileUpdate,
  ReportReason,
  ReportTarget,
  SearchFilters,
  SearchResults,
} from '../types';
import { getDB, mutate, type DemoConversation, type DemoDB } from './store';
import { extractHashtags, extractMentions, uid } from '@/lib/utils';
import { rankFeed } from '@/lib/ranking';
import { AppError } from '../errors';

const nowIso = () => new Date().toISOString();
const latency = <T>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));

export const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

/**
 * Browser-local implementation that mirrors server rules (ownership, blocks, privacy,
 * message requests, rate limits). Intended for demos and UI development only.
 */
export class DemoRepository implements Repository {
  readonly mode = 'demo' as const;
  constructor(private readonly viewer: () => string | null, private readonly ms = 120) {}

  private delay<T>(v: T) {
    return latency(v, this.ms);
  }

  private me(): string {
    const id = this.viewer();
    if (!id) throw new AppError('auth_required');
    return id;
  }

  private blockedBetween(d: DemoDB, a: string, b: string) {
    return d.blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
  }

  private withCounts(d: DemoDB, p: Profile): Profile {
    const realFollowers = d.follows.filter((f) => f.followeeId === p.id).length;
    const realFollowing = d.follows.filter((f) => f.followerId === p.id).length;
    const posts = d.posts.filter((x) => x.authorId === p.id && x.status === 'published').length;
    return p.isSample
      ? { ...p, followerCount: p.followerCount + realFollowers, followingCount: Math.max(p.followingCount, realFollowing), postCount: posts }
      : { ...p, followerCount: realFollowers, followingCount: realFollowing, postCount: posts };
  }

  private canSeePost(d: DemoDB, p: Post): boolean {
    const v = this.viewer();
    if (p.status !== 'published') return p.authorId === v;
    if (v && this.blockedBetween(d, v, p.authorId)) return false;
    const author = d.profiles.find((x) => x.id === p.authorId);
    if (author?.isPrivate && author.id !== v) return !!v && d.follows.some((f) => f.followerId === v && f.followeeId === author.id);
    return true;
  }

  private notify(d: DemoDB, n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    if (n.actorId && n.actorId === n.userId) return;
    if (n.actorId && d.mutes.some((m) => m.muterId === n.userId && m.mutedId === n.actorId)) return;
    d.notifications.unshift({ ...n, id: uid('n'), createdAt: nowIso(), read: false });
  }

  // ---------- Profiles ----------
  async getProfile(id: string) {
    const d = getDB();
    const p = d.profiles.find((x) => x.id === id);
    return this.delay(p ? this.withCounts(d, p) : null);
  }
  async getProfileByUsername(username: string) {
    const d = getDB();
    const p = d.profiles.find((x) => x.username.toLowerCase() === username.toLowerCase());
    return this.delay(p ? this.withCounts(d, p) : null);
  }
  async getProfiles(ids: string[]) {
    const d = getDB();
    return this.delay(d.profiles.filter((p) => ids.includes(p.id)).map((p) => this.withCounts(d, p)));
  }
  async isUsernameAvailable(username: string) {
    const me = this.viewer();
    return this.delay(USERNAME_RE.test(username) && !getDB().profiles.some((p) => p.username === username && p.id !== me));
  }
  async updateMyProfile(patch: ProfileUpdate) {
    const me = this.me();
    if (patch.username !== undefined) {
      if (!USERNAME_RE.test(patch.username)) throw new AppError('invalid_username');
      if (getDB().profiles.some((p) => p.username === patch.username && p.id !== me)) throw new AppError('username_taken');
    }
    if (patch.bio !== undefined && patch.bio.length > 300) throw new AppError('validation');
    const p = mutate((d) => {
      const prof = d.profiles.find((x) => x.id === me);
      if (!prof) throw new AppError('not_found');
      Object.assign(prof, patch);
      return this.withCounts(d, prof);
    });
    return this.delay(p);
  }
  async listTrendingCreators(limit = 10) {
    const d = getDB();
    const v = this.viewer();
    const list = d.profiles
      .filter((p) => p.kind === 'person' && p.isCreator && p.id !== v && !(v && this.blockedBetween(d, v, p.id)))
      .map((p) => this.withCounts(d, p))
      .sort((a, b) => b.followerCount - a.followerCount);
    return this.delay(list.slice(0, limit));
  }
  async listBrands(limit = 10) {
    const d = getDB();
    return this.delay(d.profiles.filter((p) => p.kind === 'brand').map((p) => this.withCounts(d, p)).sort((a, b) => b.followerCount - a.followerCount).slice(0, limit));
  }
  async listSuggestedCreators(limit = 6) {
    const d = getDB();
    const v = this.viewer();
    const following = new Set(d.follows.filter((f) => f.followerId === v).map((f) => f.followeeId));
    const me = d.profiles.find((p) => p.id === v);
    const list = d.profiles
      .filter((p) => p.id !== v && !following.has(p.id) && !(v && this.blockedBetween(d, v, p.id)))
      .map((p) => ({ p: this.withCounts(d, p), s: (me?.interests.filter((i) => p.interests.includes(i)).length ?? 0) * 1e6 + p.followerCount }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
    return this.delay(list.slice(0, limit));
  }

  // ---------- Graph ----------
  async follow(profileId: string) {
    const me = this.me();
    if (me === profileId) throw new AppError('validation');
    mutate((d) => {
      if (this.blockedBetween(d, me, profileId)) throw new AppError('forbidden');
      if (!d.follows.some((f) => f.followerId === me && f.followeeId === profileId)) {
        d.follows.push({ followerId: me, followeeId: profileId, createdAt: nowIso() });
        this.notify(d, { userId: profileId, type: 'follow', actorId: me, postId: null, body: null });
      }
    });
    return this.delay(undefined);
  }
  async unfollow(profileId: string) {
    const me = this.me();
    mutate((d) => {
      d.follows = d.follows.filter((f) => !(f.followerId === me && f.followeeId === profileId));
    });
    return this.delay(undefined);
  }
  async getFollowingIds() {
    const v = this.viewer();
    if (!v) return [];
    return this.delay(getDB().follows.filter((f) => f.followerId === v).map((f) => f.followeeId));
  }
  async listFollowers(profileId: string) {
    const d = getDB();
    const ids = d.follows.filter((f) => f.followeeId === profileId).map((f) => f.followerId);
    return this.delay(d.profiles.filter((p) => ids.includes(p.id)).map((p) => this.withCounts(d, p)));
  }
  async listFollowing(profileId: string) {
    const d = getDB();
    const ids = d.follows.filter((f) => f.followerId === profileId).map((f) => f.followeeId);
    return this.delay(d.profiles.filter((p) => ids.includes(p.id)).map((p) => this.withCounts(d, p)));
  }
  async block(profileId: string) {
    const me = this.me();
    mutate((d) => {
      if (!d.blocks.some((b) => b.blockerId === me && b.blockedId === profileId)) d.blocks.push({ blockerId: me, blockedId: profileId });
      d.follows = d.follows.filter((f) => !((f.followerId === me && f.followeeId === profileId) || (f.followerId === profileId && f.followeeId === me)));
    });
    return this.delay(undefined);
  }
  async unblock(profileId: string) {
    const me = this.me();
    mutate((d) => {
      d.blocks = d.blocks.filter((b) => !(b.blockerId === me && b.blockedId === profileId));
    });
    return this.delay(undefined);
  }
  async mute(profileId: string) {
    const me = this.me();
    mutate((d) => {
      if (!d.mutes.some((m) => m.muterId === me && m.mutedId === profileId)) d.mutes.push({ muterId: me, mutedId: profileId });
    });
    return this.delay(undefined);
  }
  async unmute(profileId: string) {
    const me = this.me();
    mutate((d) => {
      d.mutes = d.mutes.filter((m) => !(m.muterId === me && m.mutedId === profileId));
    });
    return this.delay(undefined);
  }
  async getBlockedIds() {
    const v = this.viewer();
    return this.delay(v ? getDB().blocks.filter((b) => b.blockerId === v).map((b) => b.blockedId) : []);
  }
  async getMutedIds() {
    const v = this.viewer();
    return this.delay(v ? getDB().mutes.filter((m) => m.muterId === v).map((m) => m.mutedId) : []);
  }

  // ---------- Posts ----------
  async getFeed(q: FeedQuery) {
    const d = getDB();
    const v = this.viewer();
    const me = d.profiles.find((p) => p.id === v);
    const following = new Set(d.follows.filter((f) => f.followerId === v).map((f) => f.followeeId));
    const muted = new Set(d.mutes.filter((m) => m.muterId === v).map((m) => m.mutedId));
    const blocked = new Set(d.blocks.filter((b) => b.blockerId === v || b.blockedId === v).map((b) => (b.blockerId === v ? b.blockedId : b.blockerId)));
    let posts = d.posts.filter((p) => this.canSeePost(d, p) && p.status === 'published' && !muted.has(p.authorId));
    if (q.category) posts = posts.filter((p) => p.category === q.category);
    if (q.mode === 'following') {
      posts = posts.filter((p) => following.has(p.authorId) || p.authorId === v).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (q.mode === 'trending') {
      const cutoff = Date.now() - 7 * 864e5;
      posts = posts
        .filter((p) => new Date(p.createdAt).getTime() > cutoff)
        .sort((a, b) => (b.likeCount + b.shareCount * 3 + b.saveCount * 2) / Math.max(b.viewCount, 1) - (a.likeCount + a.shareCount * 3 + a.saveCount * 2) / Math.max(a.viewCount, 1));
    } else {
      const authors = new Map(d.profiles.map((p) => [p.id, p]));
      posts = rankFeed(posts, authors, { viewerId: v, followingIds: following, interests: me?.interests ?? [], country: me?.country ?? 'TR', blockedIds: blocked });
    }
    const off = q.offset ?? 0;
    return this.delay(posts.slice(off, off + (q.limit ?? 20)));
  }
  async getPost(id: string) {
    const d = getDB();
    const p = d.posts.find((x) => x.id === id);
    return this.delay(p && this.canSeePost(d, p) ? p : null);
  }
  async listPostsByAuthor(authorId: string) {
    const d = getDB();
    return this.delay(d.posts.filter((p) => p.authorId === authorId && p.status === 'published' && this.canSeePost(d, p)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async listPostsByHashtag(tag: string) {
    const d = getDB();
    const t = tag.toLowerCase();
    return this.delay(d.posts.filter((p) => p.hashtags.includes(t) && p.status === 'published' && this.canSeePost(d, p)));
  }
  async listPostsByProduct(productId: string) {
    const d = getDB();
    return this.delay(d.posts.filter((p) => p.tags.some((t) => t.productId === productId) && p.status === 'published' && this.canSeePost(d, p)));
  }
  async listMyDrafts() {
    const me = this.me();
    return this.delay(getDB().posts.filter((p) => p.authorId === me && (p.status === 'draft' || p.status === 'scheduled')));
  }
  async createPost(input: NewPostInput) {
    const me = this.me();
    if (input.media.length === 0) throw new AppError('validation');
    if (input.caption.length > 2200) throw new AppError('validation');
    for (const t of input.tags) if (t.x < 0 || t.x > 1 || t.y < 0 || t.y > 1 || t.mediaIndex >= input.media.length) throw new AppError('validation');
    // rate limit: 20 posts / hour
    const recent = getDB().posts.filter((p) => p.authorId === me && Date.now() - new Date(p.createdAt).getTime() < 36e5).length;
    if (recent >= 20) throw new AppError('rate_limited');
    if (input.tags.length > 0 && input.disclosure === 'none') {
      // tagged products from an affiliate/sponsored relationship must be disclosed by the creator; we only enforce presence of a choice in UI.
    }
    const post = mutate((d) => {
      const p: Post = {
        id: uid('po'),
        authorId: me,
        type: input.type,
        media: input.media.map((m) => ({ ...m, id: uid('me') })),
        caption: input.caption,
        hashtags: extractHashtags(input.caption),
        tags: input.tags.map((t) => ({ ...t, id: uid('t') })),
        disclosure: input.disclosure,
        category: input.category,
        country: d.profiles.find((x) => x.id === me)?.country ?? null,
        status: input.status,
        scheduledAt: input.scheduledAt,
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        shareCount: 0,
        viewCount: 0,
        createdAt: nowIso(),
        isSample: false,
      };
      d.posts.unshift(p);
      if (p.status === 'published') {
        for (const m of extractMentions(p.caption)) {
          const target = d.profiles.find((x) => x.username === m);
          if (target) this.notify(d, { userId: target.id, type: 'mention', actorId: me, postId: p.id, body: null });
        }
      }
      return p;
    });
    return this.delay(post);
  }
  async deletePost(id: string) {
    const me = this.me();
    mutate((d) => {
      const p = d.posts.find((x) => x.id === id);
      if (!p) throw new AppError('not_found');
      if (p.authorId !== me) throw new AppError('forbidden');
      d.posts = d.posts.filter((x) => x.id !== id);
      d.comments = d.comments.filter((c) => c.postId !== id);
      d.likes = d.likes.filter((l) => l.postId !== id);
    });
    return this.delay(undefined);
  }
  async recordView(postId: string) {
    mutate((d) => {
      const p = d.posts.find((x) => x.id === postId);
      if (p) p.viewCount += 1;
    });
  }
  async recordShare(postId: string) {
    mutate((d) => {
      const p = d.posts.find((x) => x.id === postId);
      if (p) p.shareCount += 1;
    });
    return this.delay(undefined);
  }
  async listTrendingHashtags(limit = 12) {
    const counts = new Map<string, number>();
    for (const p of getDB().posts) if (p.status === 'published') for (const h of p.hashtags) counts.set(h, (counts.get(h) ?? 0) + 1 + p.likeCount / 1000);
    return this.delay([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => ({ tag, count: getDB().posts.filter((p) => p.hashtags.includes(tag)).length })));
  }

  // ---------- Likes ----------
  async getLikedPostIds() {
    const v = this.viewer();
    return this.delay(v ? getDB().likes.filter((l) => l.userId === v).map((l) => l.postId) : []);
  }
  async like(postId: string) {
    const me = this.me();
    mutate((d) => {
      const p = d.posts.find((x) => x.id === postId);
      if (!p || !this.canSeePost(d, p)) throw new AppError('not_found');
      if (d.likes.some((l) => l.userId === me && l.postId === postId)) return; // idempotent
      d.likes.push({ userId: me, postId, createdAt: nowIso() });
      p.likeCount += 1;
      this.notify(d, { userId: p.authorId, type: 'like', actorId: me, postId, body: null });
    });
    return this.delay(undefined, );
  }
  async unlike(postId: string) {
    const me = this.me();
    mutate((d) => {
      const before = d.likes.length;
      d.likes = d.likes.filter((l) => !(l.userId === me && l.postId === postId));
      const p = d.posts.find((x) => x.id === postId);
      if (p && d.likes.length < before) p.likeCount = Math.max(0, p.likeCount - 1);
    });
    return this.delay(undefined);
  }
  async listLikers(postId: string) {
    const d = getDB();
    const ids = d.likes.filter((l) => l.postId === postId).map((l) => l.userId);
    return this.delay(d.profiles.filter((p) => ids.includes(p.id)));
  }

  // ---------- Comments ----------
  async listComments(postId: string) {
    const d = getDB();
    const v = this.viewer();
    const blocked = new Set(d.blocks.filter((b) => b.blockerId === v).map((b) => b.blockedId));
    return this.delay(d.comments.filter((c) => c.postId === postId && !blocked.has(c.authorId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }
  async addComment(postId: string, body: string, parentId: string | null = null) {
    const me = this.me();
    const text = body.trim();
    if (!text || text.length > 1000) throw new AppError('validation');
    const recent = getDB().comments.filter((c) => c.authorId === me && Date.now() - new Date(c.createdAt).getTime() < 60_000).length;
    if (recent >= 10) throw new AppError('rate_limited');
    const c = mutate((d) => {
      const p = d.posts.find((x) => x.id === postId);
      if (!p || !this.canSeePost(d, p)) throw new AppError('not_found');
      if (this.blockedBetween(d, me, p.authorId)) throw new AppError('forbidden');
      const comment: Comment = { id: uid('c'), postId, authorId: me, parentId, body: text, createdAt: nowIso() };
      d.comments.push(comment);
      p.commentCount += 1;
      this.notify(d, { userId: p.authorId, type: 'comment', actorId: me, postId, body: text.slice(0, 120) });
      for (const m of extractMentions(text)) {
        const target = d.profiles.find((x) => x.username === m);
        if (target) this.notify(d, { userId: target.id, type: 'mention', actorId: me, postId, body: text.slice(0, 120) });
      }
      return comment;
    });
    return this.delay(c);
  }
  async deleteComment(id: string) {
    const me = this.me();
    mutate((d) => {
      const c = d.comments.find((x) => x.id === id);
      if (!c) throw new AppError('not_found');
      const post = d.posts.find((p) => p.id === c.postId);
      if (c.authorId !== me && post?.authorId !== me) throw new AppError('forbidden');
      const removed = d.comments.filter((x) => x.id === id || x.parentId === id).length;
      d.comments = d.comments.filter((x) => x.id !== id && x.parentId !== id);
      if (post) post.commentCount = Math.max(0, post.commentCount - removed);
    });
    return this.delay(undefined);
  }

  // ---------- Collections ----------
  async listCollections() {
    const me = this.me();
    return this.delay(getDB().collections.filter((c) => c.ownerId === me));
  }
  async getCollection(id: string) {
    const v = this.viewer();
    const c = getDB().collections.find((x) => x.id === id);
    return this.delay(c && (c.ownerId === v || !c.isPrivate) ? c : null);
  }
  async createCollection(name: string, isPrivate: boolean) {
    const me = this.me();
    const n = name.trim();
    if (!n || n.length > 60) throw new AppError('validation');
    const c = mutate((d) => {
      const col: Collection = { id: uid('col'), ownerId: me, name: n, isPrivate, items: [], createdAt: nowIso() };
      d.collections.push(col);
      return col;
    });
    return this.delay(c);
  }
  async deleteCollection(id: string) {
    const me = this.me();
    mutate((d) => {
      const c = d.collections.find((x) => x.id === id);
      if (!c) return;
      if (c.ownerId !== me) throw new AppError('forbidden');
      d.collections = d.collections.filter((x) => x.id !== id);
    });
    return this.delay(undefined);
  }
  async addToCollection(collectionId: string, kind: 'post' | 'product', refId: string) {
    const me = this.me();
    mutate((d) => {
      const c = d.collections.find((x) => x.id === collectionId);
      if (!c) throw new AppError('not_found');
      if (c.ownerId !== me) throw new AppError('forbidden');
      if (c.items.some((i) => i.kind === kind && i.refId === refId)) return;
      c.items.unshift({ kind, refId, addedAt: nowIso() });
      if (kind === 'post') {
        const p = d.posts.find((x) => x.id === refId);
        if (p) p.saveCount += 1;
      }
    });
    return this.delay(undefined);
  }
  async removeFromCollection(collectionId: string, kind: 'post' | 'product', refId: string) {
    const me = this.me();
    mutate((d) => {
      const c = d.collections.find((x) => x.id === collectionId);
      if (!c) return;
      if (c.ownerId !== me) throw new AppError('forbidden');
      const before = c.items.length;
      c.items = c.items.filter((i) => !(i.kind === kind && i.refId === refId));
      if (kind === 'post' && c.items.length < before) {
        const p = d.posts.find((x) => x.id === refId);
        if (p) p.saveCount = Math.max(0, p.saveCount - 1);
      }
    });
    return this.delay(undefined);
  }

  // ---------- Notifications ----------
  async listNotifications() {
    const me = this.me();
    return this.delay(getDB().notifications.filter((n) => n.userId === me).slice(0, 100));
  }
  async markNotificationsRead(ids?: string[]) {
    const me = this.me();
    mutate((d) => {
      for (const n of d.notifications) if (n.userId === me && (!ids || ids.includes(n.id))) n.read = true;
    });
    return this.delay(undefined);
  }

  // ---------- Messaging ----------
  private toConversation(d: DemoDB, c: DemoConversation, me: string): Conversation {
    const lastRead = c.lastReadAt[me] ?? '1970-01-01';
    const unread = d.messages.filter((m) => m.conversationId === c.id && m.senderId !== me && m.createdAt > lastRead).length;
    const { lastReadAt: _l, initiatorId: _i, ...rest } = c;
    // message requests are only "requests" for the recipient
    const status = c.status === 'request' && c.initiatorId === me ? 'active' : c.status;
    return { ...rest, status, unreadCount: unread };
  }
  async listConversations() {
    const me = this.me();
    const d = getDB();
    return this.delay(
      d.conversations
        .filter((c) => c.participantIds.includes(me) && !c.participantIds.some((p) => p !== me && this.blockedBetween(d, me, p)))
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((c) => this.toConversation(d, c, me)),
    );
  }
  async getConversation(id: string) {
    const me = this.me();
    const d = getDB();
    const c = d.conversations.find((x) => x.id === id && x.participantIds.includes(me));
    return this.delay(c ? this.toConversation(d, c, me) : null);
  }
  async listMessages(conversationId: string) {
    const me = this.me();
    const msgs = mutate((d) => {
      const c = d.conversations.find((x) => x.id === conversationId);
      if (!c || !c.participantIds.includes(me)) throw new AppError('forbidden');
      c.lastReadAt[me] = nowIso();
      return d.messages.filter((m) => m.conversationId === conversationId);
    });
    return this.delay(msgs);
  }
  async sendMessage(conversationId: string, body: string) {
    const me = this.me();
    const text = body.trim();
    if (!text || text.length > 2000) throw new AppError('validation');
    const recent = getDB().messages.filter((m) => m.senderId === me && Date.now() - new Date(m.createdAt).getTime() < 60_000).length;
    if (recent >= 20) throw new AppError('rate_limited');
    const m = mutate((d) => {
      const c = d.conversations.find((x) => x.id === conversationId);
      if (!c || !c.participantIds.includes(me)) throw new AppError('forbidden');
      const other = c.participantIds.find((p) => p !== me)!;
      if (this.blockedBetween(d, me, other)) throw new AppError('forbidden');
      // spam protection: initiator can send max 3 messages until the recipient accepts
      if (c.status === 'request' && c.initiatorId === me && d.messages.filter((x) => x.conversationId === c.id).length >= 3) throw new AppError('rate_limited');
      if (c.status === 'request' && c.initiatorId !== me) c.status = 'active'; // replying accepts
      const msg: Message = { id: uid('msg'), conversationId, senderId: me, body: text, createdAt: nowIso() };
      d.messages.push(msg);
      c.lastMessageAt = msg.createdAt;
      c.lastMessagePreview = text.slice(0, 80);
      c.lastReadAt[me] = msg.createdAt;
      this.notify(d, { userId: other, type: 'message', actorId: me, postId: null, body: text.slice(0, 80) });
      return msg;
    });
    return this.delay(m);
  }
  async startConversation(otherId: string, kind: 'personal' | 'collaboration') {
    const me = this.me();
    if (me === otherId) throw new AppError('validation');
    const c = mutate((d) => {
      if (this.blockedBetween(d, me, otherId)) throw new AppError('forbidden');
      const other = d.profiles.find((p) => p.id === otherId);
      if (!other) throw new AppError('not_found');
      if (kind === 'collaboration' && other.kind !== 'brand' && d.profiles.find((p) => p.id === me)?.kind !== 'brand') throw new AppError('forbidden');
      const existing = d.conversations.find((x) => x.kind === kind && x.participantIds.includes(me) && x.participantIds.includes(otherId));
      if (existing) return existing;
      const otherFollowsMe = d.follows.some((f) => f.followerId === otherId && f.followeeId === me);
      const conv: DemoConversation = {
        id: uid('cv'),
        kind,
        participantIds: [me, otherId],
        status: otherFollowsMe || kind === 'collaboration' ? 'active' : 'request',
        lastMessageAt: nowIso(),
        lastMessagePreview: '',
        lastReadAt: { [me]: nowIso() },
        initiatorId: me,
      };
      d.conversations.push(conv);
      return conv;
    });
    return this.delay(this.toConversation(getDB(), c, me));
  }
  async acceptConversation(id: string) {
    const me = this.me();
    mutate((d) => {
      const c = d.conversations.find((x) => x.id === id && x.participantIds.includes(me));
      if (c) c.status = 'active';
    });
    return this.delay(undefined);
  }

  // ---------- Commerce ----------
  async getProduct(id: string) {
    const p = getDB().products.find((x) => x.id === id);
    return this.delay(p && (p.status === 'approved' || this.isMyProposal(p)) ? p : null);
  }
  private isMyProposal(_p: Product) {
    return false;
  }
  async getProducts(ids: string[]) {
    return this.delay(getDB().products.filter((p) => ids.includes(p.id)));
  }
  async searchProducts(q: string, category?: string | null) {
    const s = q.trim().toLowerCase();
    return this.delay(
      getDB().products.filter(
        (p) => p.status === 'approved' && (!category || p.category === category) && (!s || `${p.title} ${p.brandName} ${p.variant ?? ''} ${p.gtin ?? ''}`.toLowerCase().includes(s)),
      ),
    );
  }
  async listTrendingProducts(limit = 10) {
    const d = getDB();
    const score = (id: string) => d.posts.filter((p) => p.tags.some((t) => t.productId === id)).reduce((s, p) => s + p.saveCount + p.likeCount / 4, 0);
    return this.delay(d.products.filter((p) => p.status === 'approved').sort((a, b) => score(b.id) - score(a.id)).slice(0, limit));
  }
  async listSimilarProducts(productId: string, limit = 6) {
    const d = getDB();
    const p = d.products.find((x) => x.id === productId);
    return this.delay(p ? d.products.filter((x) => x.id !== productId && x.status === 'approved' && x.category === p.category).slice(0, limit) : []);
  }
  async listOffers(productId: string) {
    return this.delay(getDB().offers.filter((o) => o.productId === productId));
  }
  async listMarketplaces() {
    return this.delay(getDB().marketplaces);
  }
  async proposeProduct(input: ProductProposal) {
    this.me();
    if (!input.title.trim() || !input.brandName.trim()) throw new AppError('validation');
    try {
      const u = new URL(input.url);
      if (u.protocol !== 'https:') throw new Error();
    } catch {
      throw new AppError('invalid_url');
    }
    const p = mutate((d) => {
      const prod: Product = {
        id: uid('pr'), brandProfileId: null, brandName: input.brandName.trim(), title: input.title.trim(), variant: input.variant, description: input.note,
        category: input.category, images: [], gtin: input.gtin, countries: [], status: 'pending_review', isSample: false,
      };
      d.products.push(prod);
      return prod;
    });
    return this.delay(p);
  }
  async recordOutboundClick(offerId: string, postId: string | null, creatorId: string | null) {
    const v = this.viewer();
    const ev = mutate((d) => {
      const e: ClickEvent = { id: uid('clk'), userId: v, offerId, postId, creatorId: creatorId === v ? null : creatorId, createdAt: nowIso() };
      d.clicks.push(e);
      return e;
    });
    const offer = getDB().offers.find((o) => o.id === offerId);
    return this.delay({ destination: offer?.url ?? null, click: ev });
  }
  async listPriceAlerts() {
    const me = this.me();
    return this.delay(getDB().priceAlerts.filter((a) => a.userId === me));
  }
  async createPriceAlert(productId: string, targetPrice: number, currency: string) {
    const me = this.me();
    if (!(targetPrice > 0)) throw new AppError('validation');
    const a = mutate((d) => {
      const existing = d.priceAlerts.find((x) => x.userId === me && x.productId === productId && x.currency === currency);
      if (existing) {
        existing.targetPrice = targetPrice;
        return existing;
      }
      const al: PriceAlert = { id: uid('pa'), userId: me, productId, targetPrice, currency, createdAt: nowIso() };
      d.priceAlerts.push(al);
      return al;
    });
    return this.delay(a);
  }
  async deletePriceAlert(id: string) {
    const me = this.me();
    mutate((d) => {
      d.priceAlerts = d.priceAlerts.filter((a) => !(a.id === id && a.userId === me));
    });
    return this.delay(undefined);
  }

  // ---------- Search ----------
  async search(q: string, f: SearchFilters): Promise<SearchResults> {
    const d = getDB();
    const s = q.trim().toLowerCase().replace(/^[#@]/, '');
    const v = this.viewer();
    const blocked = new Set(d.blocks.filter((b) => b.blockerId === v || b.blockedId === v).map((b) => (b.blockerId === v ? b.blockedId : b.blockerId)));
    const match = (t: string) => !s || t.toLowerCase().includes(s);
    const people = d.profiles
      .filter((p) => !blocked.has(p.id) && match(`${p.username} ${p.displayName} ${p.bio}`))
      .filter((p) => (!f.verifiedOnly || p.verified) && (!f.country || p.country === f.country) && (!f.category || p.interests.includes(f.category)))
      .map((p) => this.withCounts(d, p));
    let posts = d.posts.filter((p) => p.status === 'published' && this.canSeePost(d, p) && match(`${p.caption} ${p.hashtags.join(' ')}`) && (!f.category || p.category === f.category));
    if (f.sort === 'recent') posts = posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (f.sort === 'popular') posts = posts.sort((a, b) => b.likeCount - a.likeCount);
    const tagCounts = new Map<string, number>();
    for (const p of d.posts) for (const h of p.hashtags) if (match(h)) tagCounts.set(h, (tagCounts.get(h) ?? 0) + 1);
    const res: SearchResults = {
      creators: people.filter((p) => p.kind === 'person' && p.isCreator),
      brands: people.filter((p) => p.kind === 'brand'),
      products: d.products.filter((p) => p.status === 'approved' && match(`${p.title} ${p.brandName} ${p.category}`) && (!f.category || p.category === f.category) && (!f.country || p.countries.includes(f.country))),
      posts,
      hashtags: [...tagCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
    };
    return this.delay(res);
  }

  // ---------- Safety ----------
  async report(targetType: ReportTarget, targetId: string, reason: ReportReason, details: string) {
    const me = this.me();
    if (details.length > 1000) throw new AppError('validation');
    const r = mutate((d) => {
      const dup = d.reports.find((x) => x.reporterId === me && x.targetType === targetType && x.targetId === targetId && x.status === 'open');
      if (dup) return dup;
      const rep: ModerationReport = { id: uid('rep'), reporterId: me, targetType, targetId, reason, details, status: 'open', createdAt: nowIso() };
      d.reports.push(rep);
      return rep;
    });
    return this.delay(r);
  }
}
