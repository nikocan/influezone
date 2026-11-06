/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Repository } from '../repository';
import type {
  Campaign,
  CampaignApplication,
  CampaignDeliverable,
  CampaignInput,
  CampaignInvitation,
  CampaignParticipant,
  CampaignPerformance,
  CampaignStatus,
  CreatorCard,
  CreatorDiscoveryFilters,
  NewProductInput,
  OrgMember,
  OrgMembership,
  OrgRole,
  Organization,
  AffiliateLink,
  ClickStat,
  Conversion,
  ConversionStatus,
  CurrencyEarnings,
  EarningsSummary,
  Payout,
  PayoutAccount,
  AppNotification,
  Collection,
  Comment,
  Conversation,
  FeedQuery,
  Marketplace,
  Media,
  Message,
  ModerationReport,
  NewPostInput,
  Offer,
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
import { AppError } from '../errors';
import { rankFeed } from '@/lib/ranking';
import { getSupabase } from '@/lib/supabase';
import { splitCommission, round2 } from '@/lib/ledger';

type Row = Record<string, any>;

function fail(e: PostgrestError | null): void {
  if (!e) return;
  const map: Record<string, AppError['code']> = { not_eligible: 'not_eligible', campaign_not_open: 'campaign_not_open', deadline_passed: 'campaign_not_open', already_applied: 'already_applied', already_invited: 'already_applied', already_submitted: 'already_applied', disclosure_mismatch: 'disclosure_mismatch', not_participant: 'not_participant', 'invalid campaign status transition': 'invalid_transition', 'terms are locked': 'forbidden' };
  for (const [k, v] of Object.entries(map)) if (e.message.includes(k)) throw new AppError(v);
  if (e.code === '23505' && e.message.includes('organizations_slug')) throw new AppError('slug_taken');
  for (const code of ['payout_account_not_verified', 'payout_already_open', 'insufficient_available_balance', 'payout_execution_disabled'] as const) {
    if (e.message.includes(code)) {
      throw new AppError(code === 'payout_account_not_verified' ? 'payout_not_eligible' : code === 'payout_already_open' ? 'payout_open' : code === 'insufficient_available_balance' ? 'insufficient_funds' : 'payout_execution_disabled');
    }
  }
  if (e.code === '42501') throw new AppError('forbidden', e.message);
  if (e.code === 'P0429' || /rate_limited/.test(e.message)) throw new AppError('rate_limited');
  if (e.code === '23505') throw new AppError('validation', e.message);
  if (e.code === 'PGRST116' || e.code === 'P0002') throw new AppError('not_found');
  if (e.code === '23514' || e.code === '22P02') throw new AppError('validation', e.message);
  throw new AppError('unknown', e.message);
}

function sanitizeLike(q: string) {
  return q.replace(/[%_,()]/g, ' ').trim();
}

const POST_SELECT = '*, post_media(*), post_products(*)';
const MEDIA_BUCKET = 'post-media';

/** Supabase/Postgres adapter. Every write is authorized by RLS policies in supabase/migrations. */
export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;
  constructor(private readonly viewer: () => string | null) {
    this.sb = getSupabase();
  }
  private me() {
    const v = this.viewer();
    if (!v) throw new AppError('auth_required');
    return v;
  }

  // ---------- mappers ----------
  private profile(r: Row): Profile {
    return {
      id: r.id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url, bio: r.bio ?? '', country: r.country, locale: r.locale,
      kind: r.kind, isCreator: r.is_creator, verified: r.verified, website: r.website, interests: r.interests ?? [], onboardingCompleted: r.onboarding_completed,
      isPrivate: r.is_private, followerCount: r.follower_count, followingCount: r.following_count, postCount: r.post_count, createdAt: r.created_at, isSample: false,
    };
  }
  private mediaUrl(path: string | null): string | null {
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    return this.sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  private post(r: Row): Post {
    const media: Media[] = [...(r.post_media ?? [])]
      .sort((a: Row, b: Row) => a.position - b.position)
      .map((m: Row) => ({ id: m.id, type: m.type, url: this.mediaUrl(m.storage_path)!, posterUrl: this.mediaUrl(m.poster_path), width: m.width, height: m.height, alt: m.alt, captionsUrl: this.mediaUrl(m.captions_path) }));
    return {
      id: r.id, authorId: r.author_id, type: r.type, media, caption: r.caption, hashtags: r.hashtags ?? [],
      tags: (r.post_products ?? []).map((t: Row) => ({ id: t.id, productId: t.product_id, mediaIndex: t.media_index, x: Number(t.x), y: Number(t.y) })),
      disclosure: r.disclosure, category: r.category, country: r.country, status: r.status, scheduledAt: r.scheduled_at,
      likeCount: r.like_count, commentCount: r.comment_count, saveCount: r.save_count, shareCount: r.share_count, viewCount: Number(r.view_count),
      createdAt: r.published_at ?? r.created_at, isSample: false,
    };
  }
  private product(r: Row): Product {
    const v = (r.product_variants ?? [])[0];
    return {
      id: r.id, brandProfileId: r.brand_profile_id, brandName: r.brand_name, title: r.title, variant: v?.label ?? null, description: r.description,
      category: r.category, images: r.images ?? [], gtin: v?.gtin ?? null, countries: r.countries ?? [], status: r.status, isSample: false,
    };
  }

  // ---------- Profiles ----------
  async getProfile(id: string) {
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', id).maybeSingle();
    fail(error);
    return data ? this.profile(data) : null;
  }
  async getProfileByUsername(username: string) {
    const { data, error } = await this.sb.from('profiles').select('*').eq('username', username).maybeSingle();
    fail(error);
    return data ? this.profile(data) : null;
  }
  async getProfiles(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('profiles').select('*').in('id', ids);
    fail(error);
    return (data ?? []).map((r) => this.profile(r));
  }
  async updateMyProfile(patch: ProfileUpdate) {
    const me = this.me();
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.username !== undefined) row.username = patch.username;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.website !== undefined) row.website = patch.website;
    if (patch.country !== undefined) row.country = patch.country;
    if (patch.locale !== undefined) row.locale = patch.locale;
    if (patch.interests !== undefined) row.interests = patch.interests;
    if (patch.isCreator !== undefined) row.is_creator = patch.isCreator;
    if (patch.isPrivate !== undefined) row.is_private = patch.isPrivate;
    if (patch.onboardingCompleted !== undefined) row.onboarding_completed = patch.onboardingCompleted;
    const { data, error } = await this.sb.from('profiles').update(row).eq('id', me).select('*').single();
    if (error?.code === '23505') throw new AppError('username_taken');
    fail(error);
    return this.profile(data!);
  }
  async isUsernameAvailable(username: string) {
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) return false;
    const { data } = await this.sb.from('profiles').select('id').eq('username', username).maybeSingle();
    return !data || data.id === this.viewer();
  }
  async listTrendingCreators(limit = 10) {
    const { data, error } = await this.sb.from('profiles').select('*').eq('is_creator', true).eq('kind', 'person').order('follower_count', { ascending: false }).limit(limit);
    fail(error);
    return (data ?? []).map((r) => this.profile(r)).filter((p) => p.id !== this.viewer());
  }
  async listBrands(limit = 10) {
    const { data, error } = await this.sb.from('profiles').select('*').eq('kind', 'brand').order('follower_count', { ascending: false }).limit(limit);
    fail(error);
    return (data ?? []).map((r) => this.profile(r));
  }
  async listSuggestedCreators(limit = 6) {
    const following = new Set(await this.getFollowingIds());
    const all = await this.listTrendingCreators(limit + following.size + 1);
    return all.filter((p) => !following.has(p.id)).slice(0, limit);
  }

  // ---------- Graph ----------
  async follow(profileId: string) {
    const { error } = await this.sb.from('follows').upsert({ follower_id: this.me(), followee_id: profileId }, { ignoreDuplicates: true });
    fail(error);
  }
  async unfollow(profileId: string) {
    const { error } = await this.sb.from('follows').delete().eq('follower_id', this.me()).eq('followee_id', profileId);
    fail(error);
  }
  async getFollowingIds() {
    const v = this.viewer();
    if (!v) return [];
    const { data, error } = await this.sb.from('follows').select('followee_id').eq('follower_id', v);
    fail(error);
    return (data ?? []).map((r) => r.followee_id as string);
  }
  async listFollowers(profileId: string) {
    const { data, error } = await this.sb.from('follows').select('profiles!follows_follower_id_fkey(*)').eq('followee_id', profileId).limit(200);
    fail(error);
    return (data ?? []).map((r: Row) => this.profile(r.profiles));
  }
  async listFollowing(profileId: string) {
    const { data, error } = await this.sb.from('follows').select('profiles!follows_followee_id_fkey(*)').eq('follower_id', profileId).limit(200);
    fail(error);
    return (data ?? []).map((r: Row) => this.profile(r.profiles));
  }
  async block(profileId: string) {
    const { error } = await this.sb.from('blocks').upsert({ blocker_id: this.me(), blocked_id: profileId }, { ignoreDuplicates: true });
    fail(error);
  }
  async unblock(profileId: string) {
    const { error } = await this.sb.from('blocks').delete().eq('blocker_id', this.me()).eq('blocked_id', profileId);
    fail(error);
  }
  async mute(profileId: string) {
    const { error } = await this.sb.from('mutes').upsert({ muter_id: this.me(), muted_id: profileId }, { ignoreDuplicates: true });
    fail(error);
  }
  async unmute(profileId: string) {
    const { error } = await this.sb.from('mutes').delete().eq('muter_id', this.me()).eq('muted_id', profileId);
    fail(error);
  }
  async getBlockedIds() {
    const v = this.viewer();
    if (!v) return [];
    const { data } = await this.sb.from('blocks').select('blocked_id').eq('blocker_id', v);
    return (data ?? []).map((r) => r.blocked_id as string);
  }
  async getMutedIds() {
    const v = this.viewer();
    if (!v) return [];
    const { data } = await this.sb.from('mutes').select('muted_id').eq('muter_id', v);
    return (data ?? []).map((r) => r.muted_id as string);
  }

  // ---------- Posts ----------
  async getFeed(q: FeedQuery) {
    const limit = q.limit ?? 20;
    const offset = q.offset ?? 0;
    const muted = new Set(await this.getMutedIds());
    let query = this.sb.from('posts').select(POST_SELECT).eq('status', 'published');
    if (q.category) query = query.eq('category', q.category);
    if (q.mode === 'following') {
      const ids = await this.getFollowingIds();
      const v = this.viewer();
      if (v) ids.push(v);
      if (!ids.length) return [];
      const { data, error } = await query.in('author_id', ids).order('published_at', { ascending: false }).range(offset, offset + limit - 1);
      fail(error);
      return (data ?? []).map((r) => this.post(r)).filter((p) => !muted.has(p.authorId));
    }
    if (q.mode === 'trending') {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data, error } = await query.gte('published_at', since).order('like_count', { ascending: false }).range(offset, offset + limit - 1);
      fail(error);
      return (data ?? []).map((r) => this.post(r)).filter((p) => !muted.has(p.authorId));
    }
    // For You: candidate generation (recent window) + transparent client-side ranking
    const { data, error } = await query.order('published_at', { ascending: false }).limit(200);
    fail(error);
    const posts = (data ?? []).map((r) => this.post(r)).filter((p) => !muted.has(p.authorId));
    const authors = new Map((await this.getProfiles([...new Set(posts.map((p) => p.authorId))])).map((p) => [p.id, p]));
    const v = this.viewer();
    const me = v ? await this.getProfile(v) : null;
    const ranked = rankFeed(posts, authors, {
      viewerId: v, followingIds: new Set(await this.getFollowingIds()), interests: me?.interests ?? [], country: me?.country ?? 'TR', blockedIds: new Set(await this.getBlockedIds()),
    });
    return ranked.slice(offset, offset + limit);
  }
  async getPost(id: string) {
    const { data, error } = await this.sb.from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
    fail(error);
    return data ? this.post(data) : null;
  }
  async listPostsByAuthor(authorId: string) {
    const { data, error } = await this.sb.from('posts').select(POST_SELECT).eq('author_id', authorId).eq('status', 'published').order('published_at', { ascending: false }).limit(60);
    fail(error);
    return (data ?? []).map((r) => this.post(r));
  }
  async listPostsByHashtag(tag: string) {
    const { data, error } = await this.sb.from('posts').select(POST_SELECT).contains('hashtags', [tag.toLowerCase()]).eq('status', 'published').order('published_at', { ascending: false }).limit(60);
    fail(error);
    return (data ?? []).map((r) => this.post(r));
  }
  async listPostsByProduct(productId: string) {
    const { data, error } = await this.sb.from('post_products').select('post_id').eq('product_id', productId).limit(60);
    fail(error);
    const ids = [...new Set((data ?? []).map((r) => r.post_id as string))];
    if (!ids.length) return [];
    const res = await this.sb.from('posts').select(POST_SELECT).in('id', ids).eq('status', 'published');
    fail(res.error);
    return (res.data ?? []).map((r) => this.post(r));
  }
  async listMyDrafts() {
    const { data, error } = await this.sb.from('posts').select(POST_SELECT).eq('author_id', this.me()).in('status', ['draft', 'scheduled']).order('updated_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.post(r));
  }
  /**
   * Media must already be uploaded to Storage (see uploadMedia); input.media[].url holds the storage path or a data URL.
   */
  async createPost(input: NewPostInput) {
    const me = this.me();
    const { data: post, error } = await this.sb
      .from('posts')
      .insert({ author_id: me, type: input.type, caption: input.caption, disclosure: input.disclosure, category: input.category, status: input.status, scheduled_at: input.scheduledAt })
      .select('id')
      .single();
    fail(error);
    const media = await Promise.all(input.media.map(async (m, i) => ({
      post_id: post!.id, position: i, type: m.type, storage_path: await this.uploadIfDataUrl(me, m.url), poster_path: m.posterUrl ? await this.uploadIfDataUrl(me, m.posterUrl) : null,
      width: m.width, height: m.height, alt: m.alt,
    })));
    const r1 = await this.sb.from('post_media').insert(media);
    fail(r1.error);
    if (input.tags.length) {
      const r2 = await this.sb.from('post_products').insert(input.tags.map((t) => ({ post_id: post!.id, product_id: t.productId, media_index: t.mediaIndex, x: t.x, y: t.y })));
      fail(r2.error);
    }
    return (await this.getPost(post!.id))!;
  }
  private async uploadIfDataUrl(userId: string, url: string): Promise<string> {
    if (!url.startsWith('data:') && !url.startsWith('blob:')) return url;
    const blob = await (await fetch(url)).blob();
    const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw new AppError('unknown', error.message);
    return path;
  }
  async deletePost(id: string) {
    const { error } = await this.sb.from('posts').delete().eq('id', id);
    fail(error);
  }
  async recordView(postId: string) {
    await this.sb.rpc('record_post_view', { _post: postId });
  }
  async recordShare(postId: string) {
    const { error } = await this.sb.rpc('record_post_share', { _post: postId });
    fail(error);
  }
  async listTrendingHashtags(limit = 12) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data } = await this.sb.from('posts').select('hashtags').eq('status', 'published').gte('published_at', since).limit(500);
    const counts = new Map<string, number>();
    for (const r of data ?? []) for (const h of (r.hashtags as string[]) ?? []) counts.set(h, (counts.get(h) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, count]) => ({ tag, count }));
  }

  // ---------- Likes ----------
  async getLikedPostIds() {
    const v = this.viewer();
    if (!v) return [];
    const { data } = await this.sb.from('likes').select('post_id').eq('profile_id', v).order('created_at', { ascending: false }).limit(1000);
    return (data ?? []).map((r) => r.post_id as string);
  }
  async like(postId: string) {
    const { error } = await this.sb.from('likes').upsert({ profile_id: this.me(), post_id: postId }, { ignoreDuplicates: true });
    fail(error);
  }
  async unlike(postId: string) {
    const { error } = await this.sb.from('likes').delete().eq('profile_id', this.me()).eq('post_id', postId);
    fail(error);
  }
  async listLikers(postId: string) {
    const { data, error } = await this.sb.from('likes').select('profiles(*)').eq('post_id', postId).order('created_at', { ascending: false }).limit(200);
    fail(error);
    return (data ?? []).map((r: Row) => this.profile(r.profiles));
  }

  // ---------- Comments ----------
  async listComments(postId: string) {
    const { data, error } = await this.sb.from('comments').select('*').eq('post_id', postId).order('created_at').limit(500);
    fail(error);
    return (data ?? []).map((r) => ({ id: r.id, postId: r.post_id, authorId: r.author_id, parentId: r.parent_id, body: r.body, createdAt: r.created_at }) as Comment);
  }
  async addComment(postId: string, body: string, parentId: string | null = null) {
    const { data, error } = await this.sb.from('comments').insert({ post_id: postId, author_id: this.me(), parent_id: parentId, body: body.trim() }).select('*').single();
    fail(error);
    return { id: data!.id, postId, authorId: data!.author_id, parentId, body: data!.body, createdAt: data!.created_at };
  }
  async deleteComment(id: string) {
    const { error } = await this.sb.from('comments').delete().eq('id', id);
    fail(error);
  }

  // ---------- Collections ----------
  private collection(r: Row): Collection {
    return {
      id: r.id, ownerId: r.owner_id, name: r.name, isPrivate: r.is_private, createdAt: r.created_at,
      items: (r.collection_items ?? []).map((i: Row) => ({ kind: i.kind, refId: i.ref_id, addedAt: i.added_at })).sort((a: any, b: any) => b.addedAt.localeCompare(a.addedAt)),
    };
  }
  async listCollections() {
    const { data, error } = await this.sb.from('collections').select('*, collection_items(*)').eq('owner_id', this.me()).order('created_at');
    fail(error);
    return (data ?? []).map((r) => this.collection(r));
  }
  async getCollection(id: string) {
    const { data, error } = await this.sb.from('collections').select('*, collection_items(*)').eq('id', id).maybeSingle();
    fail(error);
    return data ? this.collection(data) : null;
  }
  async createCollection(name: string, isPrivate: boolean) {
    const { data, error } = await this.sb.from('collections').insert({ owner_id: this.me(), name: name.trim(), is_private: isPrivate }).select('*').single();
    fail(error);
    return this.collection({ ...data, collection_items: [] });
  }
  async deleteCollection(id: string) {
    const { error } = await this.sb.from('collections').delete().eq('id', id);
    fail(error);
  }
  async addToCollection(collectionId: string, kind: 'post' | 'product', refId: string) {
    const { error } = await this.sb.from('collection_items').upsert({ collection_id: collectionId, kind, ref_id: refId }, { ignoreDuplicates: true });
    fail(error);
  }
  async removeFromCollection(collectionId: string, kind: 'post' | 'product', refId: string) {
    const { error } = await this.sb.from('collection_items').delete().eq('collection_id', collectionId).eq('kind', kind).eq('ref_id', refId);
    fail(error);
  }

  // ---------- Notifications ----------
  async listNotifications() {
    const { data, error } = await this.sb.from('notifications').select('*').eq('user_profile_id', this.me()).order('created_at', { ascending: false }).limit(100);
    fail(error);
    return (data ?? []).map((r) => ({ id: r.id, userId: r.user_profile_id, type: r.type, actorId: r.actor_id, postId: r.post_id, body: r.body, read: r.read, createdAt: r.created_at }) as AppNotification);
  }
  async markNotificationsRead(ids?: string[]) {
    let q = this.sb.from('notifications').update({ read: true }).eq('user_profile_id', this.me()).eq('read', false);
    if (ids) q = q.in('id', ids);
    const { error } = await q;
    fail(error);
  }

  // ---------- Messaging ----------
  private async toConversation(r: Row, me: string): Promise<Conversation> {
    const parts: Row[] = r.conversation_participants ?? [];
    const mine = parts.find((p) => p.profile_id === me);
    const { count } = await this.sb.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', r.id).neq('sender_id', me).gt('created_at', mine?.last_read_at ?? '1970-01-01');
    return {
      id: r.id, kind: r.kind, participantIds: parts.map((p) => p.profile_id), status: r.status === 'request' && r.created_by === me ? 'active' : r.status,
      lastMessageAt: r.last_message_at, lastMessagePreview: r.last_message_preview, unreadCount: count ?? 0,
    };
  }
  async listConversations() {
    const me = this.me();
    const { data, error } = await this.sb.from('conversations').select('*, conversation_participants(*)').order('last_message_at', { ascending: false }).limit(100);
    fail(error);
    return Promise.all((data ?? []).map((r) => this.toConversation(r, me)));
  }
  async getConversation(id: string) {
    const me = this.me();
    const { data, error } = await this.sb.from('conversations').select('*, conversation_participants(*)').eq('id', id).maybeSingle();
    fail(error);
    return data ? this.toConversation(data, me) : null;
  }
  async listMessages(conversationId: string) {
    const me = this.me();
    const { data, error } = await this.sb.from('messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(500);
    fail(error);
    await this.sb.from('conversation_participants').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('profile_id', me);
    return (data ?? []).map((r) => ({ id: r.id, conversationId, senderId: r.sender_id, body: r.body, createdAt: r.created_at }) as Message);
  }
  async sendMessage(conversationId: string, body: string) {
    const { data, error } = await this.sb.from('messages').insert({ conversation_id: conversationId, sender_id: this.me(), body: body.trim() }).select('*').single();
    fail(error);
    return { id: data!.id, conversationId, senderId: data!.sender_id, body: data!.body, createdAt: data!.created_at };
  }
  async startConversation(otherId: string, kind: 'personal' | 'collaboration') {
    const { data, error } = await this.sb.rpc('start_conversation', { _me: this.me(), _other: otherId, _kind: kind });
    fail(error);
    return (await this.getConversation(data as string))!;
  }
  async acceptConversation(id: string) {
    const { error } = await this.sb.from('conversations').update({ status: 'active' }).eq('id', id);
    fail(error);
  }

  // ---------- Commerce ----------
  async getProduct(id: string) {
    const { data, error } = await this.sb.from('products').select('*, product_variants(*)').eq('id', id).maybeSingle();
    fail(error);
    return data ? this.product(data) : null;
  }
  async getProducts(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('products').select('*, product_variants(*)').in('id', ids);
    fail(error);
    return (data ?? []).map((r) => this.product(r));
  }
  async searchProducts(q: string, category?: string | null) {
    let query = this.sb.from('products').select('*, product_variants(*)').eq('status', 'approved').limit(40);
    const s = sanitizeLike(q);
    if (s) query = query.or(`title.ilike.%${s}%,brand_name.ilike.%${s}%`);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    fail(error);
    return (data ?? []).map((r) => this.product(r));
  }
  async listTrendingProducts(limit = 10) {
    const { data } = await this.sb.from('post_products').select('product_id').order('created_at', { ascending: false }).limit(500);
    const counts = new Map<string, number>();
    for (const r of data ?? []) counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1);
    const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
    const products = await this.getProducts(ids);
    return ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p && p.status === 'approved');
  }
  async listSimilarProducts(productId: string, limit = 6) {
    const p = await this.getProduct(productId);
    if (!p) return [];
    const { data } = await this.sb.from('products').select('*, product_variants(*)').eq('status', 'approved').eq('category', p.category).neq('id', productId).limit(limit);
    return (data ?? []).map((r) => this.product(r));
  }
  async listOffers(productId: string) {
    const { data, error } = await this.sb.from('product_offers').select('*').eq('product_id', productId);
    fail(error);
    return (data ?? []).map((r) => ({
      id: r.id, productId: r.product_id, marketplaceId: r.marketplace_id, price: Number(r.price), currency: r.currency, shippingCost: r.shipping_cost === null ? null : Number(r.shipping_cost),
      availability: r.availability, priceSource: r.price_source, lastUpdated: r.last_updated, country: r.country, affiliateEligible: Boolean(r.affiliate_program_id),
      url: r.destination_url ? 'redirect' : null, // real destination is only returned by outbound_redirect()
    }) as Offer);
  }
  async listMarketplaces() {
    const { data, error } = await this.sb.from('marketplaces').select('*');
    fail(error);
    return (data ?? []).map((r) => ({ id: r.id, name: r.name, color: '#7047EB', countries: r.countries ?? [], isSample: false }) as Marketplace);
  }
  async proposeProduct(p: ProductProposal): Promise<Product> {
    const { data, error } = await this.sb.from('product_proposals').insert({
      proposed_by: this.me(), brand_name: p.brandName, title: p.title, variant: p.variant, url: p.url, gtin: p.gtin, category: p.category, note: p.note,
    }).select('*').single();
    if (error?.code === '23514') throw new AppError('invalid_url');
    fail(error);
    return { id: data!.id, brandProfileId: null, brandName: p.brandName, title: p.title, variant: p.variant, description: p.note, category: p.category, images: [], gtin: p.gtin, countries: [], status: 'pending_review', isSample: false };
  }
  async recordOutboundClick(offerId: string, postId: string | null, creatorId: string | null) {
    const { data, error } = await this.sb.rpc('outbound_redirect', { _offer: offerId, _post: postId, _creator: creatorId });
    fail(error);
    return { destination: (data as string | null) ?? null, click: null };
  }
  async listPriceAlerts() {
    const { data, error } = await this.sb.from('price_alerts').select('*').eq('user_id', this.me());
    fail(error);
    return (data ?? []).map((r) => ({ id: r.id, userId: r.user_id, productId: r.product_id, targetPrice: Number(r.target_price), currency: r.currency, createdAt: r.created_at }) as PriceAlert);
  }
  async createPriceAlert(productId: string, targetPrice: number, currency: string) {
    const { data, error } = await this.sb.from('price_alerts').upsert({ user_id: this.me(), product_id: productId, target_price: targetPrice, currency }, { onConflict: 'user_id,product_id,currency' }).select('*').single();
    fail(error);
    return { id: data!.id, userId: data!.user_id, productId, targetPrice, currency, createdAt: data!.created_at };
  }
  async deletePriceAlert(id: string) {
    const { error } = await this.sb.from('price_alerts').delete().eq('id', id);
    fail(error);
  }

  // ---------- Search ----------
  async search(q: string, f: SearchFilters): Promise<SearchResults> {
    const s = sanitizeLike(q.replace(/^[#@]/, ''));
    let pq = this.sb.from('profiles').select('*').limit(30);
    if (s) pq = pq.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`);
    if (f.verifiedOnly) pq = pq.eq('verified', true);
    if (f.country) pq = pq.eq('country', f.country);
    if (f.category) pq = pq.contains('interests', [f.category]);
    let postQ = this.sb.from('posts').select(POST_SELECT).eq('status', 'published').limit(30);
    if (s) postQ = postQ.ilike('caption', `%${s}%`);
    if (f.category) postQ = postQ.eq('category', f.category);
    postQ = f.sort === 'popular' ? postQ.order('like_count', { ascending: false }) : postQ.order('published_at', { ascending: false });
    const [people, posts, products, tags] = await Promise.all([pq, postQ, this.searchProducts(s, f.category), this.listTrendingHashtags(50)]);
    fail(people.error);
    fail(posts.error);
    const profiles = (people.data ?? []).map((r) => this.profile(r));
    return {
      creators: profiles.filter((p) => p.kind === 'person' && p.isCreator),
      brands: profiles.filter((p) => p.kind === 'brand'),
      products: f.country ? products.filter((p) => p.countries.includes(f.country!)) : products,
      posts: (posts.data ?? []).map((r) => this.post(r)),
      hashtags: tags.filter((t) => !s || t.tag.includes(s.toLowerCase())),
    };
  }

  // ---------- Monetisation ----------
  private link(r: Row): AffiliateLink {
    return { id: r.id, creatorId: r.creator_id, offerId: r.offer_id, code: r.code, createdAt: r.created_at, trackingActive: Boolean(r.program_id) };
  }
  async listAffiliateLinks() {
    const { data, error } = await this.sb.from('affiliate_links').select('*').eq('creator_id', this.me()).order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.link(r));
  }
  async createAffiliateLink(offerId: string) {
    const me = this.me();
    const existing = await this.sb.from('affiliate_links').select('*').eq('creator_id', me).eq('offer_id', offerId).maybeSingle();
    if (existing.data) return this.link(existing.data);
    const { data: offer } = await this.sb.from('product_offers').select('affiliate_program_id').eq('id', offerId).maybeSingle();
    const { data, error } = await this.sb.from('affiliate_links').insert({ creator_id: me, offer_id: offerId, program_id: offer?.affiliate_program_id ?? null }).select('*').single();
    fail(error);
    return this.link(data!);
  }
  private conversion(r: Row): Conversion {
    const share = r.creator_share_bps as number | null;
    return {
      id: r.id, networkName: r.affiliate_networks?.name ?? '', providerEventId: r.provider_event_id, creatorId: r.creator_id, offerId: r.offer_id, productId: r.product_offers?.product_id ?? null,
      orderAmount: Number(r.order_amount), commissionAmount: Number(r.commission_amount), currency: r.currency, status: r.status, rejectReason: r.reject_reason,
      creatorShareBps: share, creatorAmount: share === null ? null : splitCommission(Number(r.commission_amount) - Number(r.reversed_amount), share).creator,
      reversedAmount: Number(r.reversed_amount), occurredAt: r.occurred_at, confirmedAt: r.confirmed_at, holdUntil: r.hold_until, isSample: false,
    };
  }
  async listConversions(status: ConversionStatus | 'all' = 'all') {
    let q = this.sb.from('conversion_events').select('*, affiliate_networks(name), product_offers(product_id)').eq('creator_id', this.me()).order('occurred_at', { ascending: false }).limit(500);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    fail(error);
    return (data ?? []).map((r) => this.conversion(r));
  }
  async getPayoutAccount(): Promise<PayoutAccount> {
    const me = this.me();
    const { data, error } = await this.sb.from('payout_accounts').select('*').eq('creator_id', me).maybeSingle();
    fail(error);
    return data
      ? { creatorId: me, provider: data.provider, status: data.status, kycStatus: data.kyc_status, taxFormStatus: data.tax_form_status, payoutCurrency: data.payout_currency }
      : { creatorId: me, provider: 'unconfigured', status: 'not_started', kycStatus: 'not_started', taxFormStatus: 'not_started', payoutCurrency: null };
  }
  async getEarningsSummary(): Promise<EarningsSummary> {
    const me = this.me();
    const [bal, convs, clicks, acct] = await Promise.all([
      this.sb.from('creator_balances').select('*').eq('creator_id', me),
      this.listConversions('all'),
      this.sb.from('click_events').select('id', { count: 'exact', head: true }).eq('creator_id', me),
      this.getPayoutAccount(),
    ]);
    fail(bal.error);
    const eligible = acct.status === 'verified' && acct.kycStatus === 'verified' && acct.taxFormStatus === 'accepted';
    const byCur = new Map<string, CurrencyEarnings>();
    const get = (c: string) => byCur.get(c) ?? byCur.set(c, { currency: c, estimated: 0, pending: 0, approved: 0, inPayout: 0, paid: 0, reversed: 0, available: 0 }).get(c)!;
    for (const r of bal.data ?? []) {
      const e = get(r.currency);
      const amt = Number(r.amount);
      if (r.bucket === 'pending') e.pending = amt;
      if (r.bucket === 'approved') e.approved = amt;
      if (r.bucket === 'in_payout') e.inPayout = amt;
      if (r.bucket === 'paid') e.paid = amt;
    }
    for (const c of convs) {
      const e = get(c.currency);
      if (c.status === 'reported') e.estimated = round2(e.estimated + splitCommission(c.commissionAmount, 7000).creator); // default share; labelled as estimate
      if (c.reversedAmount > 0 && c.creatorShareBps !== null) e.reversed = round2(e.reversed + splitCommission(c.reversedAmount, c.creatorShareBps).creator);
    }
    for (const e of byCur.values()) e.available = eligible ? Math.max(0, e.approved) : 0;
    return {
      byCurrency: [...byCur.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      clicks: clicks.count ?? 0,
      reportedConversions: convs.filter((c) => c.status === 'reported').length,
      confirmedConversions: convs.filter((c) => c.status === 'confirmed' || c.status === 'approved').length,
      payoutEligible: eligible,
    };
  }
  async getClickStats(): Promise<ClickStat[]> {
    const me = this.me();
    const [{ data: clicks, error }, convs] = await Promise.all([
      this.sb.from('click_events').select('offer_id, product_offers(product_id)').eq('creator_id', me).limit(5000),
      this.listConversions('all'),
    ]);
    fail(error);
    const map = new Map<string, ClickStat>();
    const get = (pid: string) => map.get(pid) ?? map.set(pid, { productId: pid, postId: null, clicks: 0, confirmedConversions: 0, creatorEarned: [] }).get(pid)!;
    for (const c of (clicks ?? []) as Row[]) if (c.product_offers?.product_id) get(c.product_offers.product_id).clicks++;
    for (const c of convs) {
      if (!c.productId || (c.status !== 'confirmed' && c.status !== 'approved')) continue;
      const s = get(c.productId);
      s.confirmedConversions++;
      const cur = s.creatorEarned.find((x) => x.currency === c.currency);
      if (cur) cur.amount = round2(cur.amount + (c.creatorAmount ?? 0));
      else s.creatorEarned.push({ currency: c.currency, amount: c.creatorAmount ?? 0 });
    }
    return [...map.values()].sort((a, b) => b.clicks - a.clicks);
  }
  async listPayouts(): Promise<Payout[]> {
    const { data, error } = await this.sb.from('payouts').select('*, payout_events(*)').eq('creator_id', this.me()).order('requested_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r: Row) => ({
      id: r.id, creatorId: r.creator_id, currency: r.currency, amount: Number(r.amount), status: r.status, requestedAt: r.requested_at,
      events: (r.payout_events ?? []).map((e: Row) => ({ status: e.status, note: e.note, at: e.created_at })).sort((a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at)),
    }));
  }
  async requestPayout(currency: string, amount: number) {
    const { data, error } = await this.sb.rpc('request_payout', { _creator: this.me(), _currency: currency, _amount: amount });
    fail(error);
    return (await this.listPayouts()).find((p) => p.id === data)!;
  }

  // ---------- Brand portal ----------
  private org(r: Row): Organization {
    const bp = (r.profiles ?? []).find((p: Row) => p.kind === 'brand');
    return { id: r.id, name: r.name, slug: r.slug, website: r.website, country: r.country, verificationStatus: r.verification_status, brandProfileId: bp?.id ?? null, createdAt: r.created_at, isSample: false };
  }
  private campaign(r: Row): Campaign {
    return {
      id: r.id, organizationId: r.organization_id, brandProfileId: r.brand_profile_id, title: r.title, objective: r.objective, brief: r.brief, type: r.type, currency: r.currency,
      budget: r.budget === null ? null : Number(r.budget), fixedFee: r.fixed_fee === null ? null : Number(r.fixed_fee), commissionBps: r.commission_bps, countries: r.countries ?? [],
      categories: r.categories ?? [], minFollowers: r.min_followers, deliverables: r.deliverables ?? [], requiredDisclosure: r.required_disclosure, productIds: r.product_ids ?? [],
      applicationDeadline: r.application_deadline, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, rejectionNote: r.rejection_note, createdAt: r.created_at, isSample: false,
    };
  }
  private campaignRow(input: CampaignInput): Row {
    return {
      title: input.title, objective: input.objective, brief: input.brief, type: input.type, currency: input.currency, budget: input.budget, fixed_fee: input.fixedFee, commission_bps: input.commissionBps,
      countries: input.countries, categories: input.categories, min_followers: input.minFollowers, deliverables: input.deliverables, required_disclosure: input.requiredDisclosure,
      product_ids: input.productIds, application_deadline: input.applicationDeadline, starts_at: input.startsAt, ends_at: input.endsAt,
    };
  }
  async listMyOrganizations(): Promise<OrgMembership[]> {
    const { data: auth } = await this.sb.auth.getUser();
    const { data, error } = await this.sb.from('organization_members').select('role, organizations(*, profiles(id, kind))').eq('user_id', auth.user?.id ?? '');
    fail(error);
    return (data ?? []).map((r: Row) => ({ role: r.role, organization: this.org(r.organizations) }));
  }
  async registerBrand(input: { name: string; slug: string; country: string; website: string | null; username: string }) {
    const { data, error } = await this.sb.rpc('register_brand', { _name: input.name, _slug: input.slug, _country: input.country, _website: input.website ?? '', _username: input.username });
    if (error?.code === '23505') throw new AppError(error.message.includes('username') ? 'username_taken' : 'slug_taken');
    fail(error);
    return (await this.listMyOrganizations()).find((m) => m.organization.id === data)!.organization;
  }
  async updateOrganization(orgId: string, patch: { name?: string; website?: string | null; country?: string }) {
    const { data, error } = await this.sb.from('organizations').update(patch).eq('id', orgId).select('*, profiles(id, kind)').single();
    fail(error);
    return this.org(data!);
  }
  async listOrgMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await this.sb.from('organization_members').select('user_id, role').eq('organization_id', orgId);
    fail(error);
    return (data ?? []).map((r) => ({ userId: r.user_id, profileId: r.user_id, role: r.role }));
  }
  async addOrgMember(orgId: string, username: string, role: Exclude<OrgRole, 'owner'>) {
    const { error } = await this.sb.rpc('add_org_member', { _org: orgId, _username: username, _role: role });
    fail(error);
  }
  async removeOrgMember(orgId: string, userId: string) {
    const { error } = await this.sb.from('organization_members').delete().eq('organization_id', orgId).eq('user_id', userId);
    fail(error);
  }
  async listOrgProducts(orgId: string) {
    const { data, error } = await this.sb.from('products').select('*, product_variants(*)').eq('organization_id', orgId).order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.product(r));
  }
  async createOrgProduct(orgId: string, input: NewProductInput) {
    const org = (await this.listMyOrganizations()).find((m) => m.organization.id === orgId)?.organization;
    const { data, error } = await this.sb.from('products').insert({
      organization_id: orgId, brand_profile_id: org?.brandProfileId ?? null, brand_name: org?.name ?? '', title: input.title, description: input.description, category: input.category,
      images: input.imageUrl ? [input.imageUrl] : [], countries: input.countries, status: 'pending_review', submitted_by: (await this.sb.auth.getUser()).data.user?.id,
    }).select('*').single();
    fail(error);
    if (input.variant || input.gtin) {
      const r = await this.sb.from('product_variants').insert({ product_id: data!.id, label: input.variant ?? 'default', gtin: input.gtin });
      fail(r.error);
    }
    return this.product({ ...data, product_variants: [{ label: input.variant, gtin: input.gtin }] });
  }
  async listCampaigns(orgId: string) {
    const { data, error } = await this.sb.from('campaigns').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.campaign(r));
  }
  async getCampaign(id: string) {
    const { data, error } = await this.sb.from('campaigns').select('*').eq('id', id).maybeSingle();
    fail(error);
    return data ? this.campaign(data) : null;
  }
  async saveCampaign(orgId: string, input: CampaignInput, id?: string) {
    if (id) {
      const { data, error } = await this.sb.from('campaigns').update(this.campaignRow(input)).eq('id', id).select('*').single();
      fail(error);
      return this.campaign(data!);
    }
    const org = (await this.listMyOrganizations()).find((m) => m.organization.id === orgId)?.organization;
    const { data, error } = await this.sb.from('campaigns').insert({ ...this.campaignRow(input), organization_id: orgId, brand_profile_id: org?.brandProfileId ?? null, created_by: (await this.sb.auth.getUser()).data.user?.id }).select('*').single();
    fail(error);
    return this.campaign(data!);
  }
  async setCampaignStatus(id: string, status: CampaignStatus, note?: string) {
    const { data, error } = await this.sb.from('campaigns').update({ status, rejection_note: note ?? null }).eq('id', id).select('*').single();
    fail(error);
    return this.campaign(data!);
  }
  async discoverCreators(f: CreatorDiscoveryFilters): Promise<CreatorCard[]> {
    let q = this.sb.from('profiles').select('*').eq('kind', 'person').eq('is_creator', true).gte('follower_count', f.minFollowers ?? 0).order('follower_count', { ascending: false }).limit(60);
    const s = sanitizeLike(f.q ?? '');
    if (s) q = q.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`);
    if (f.country) q = q.eq('country', f.country);
    if (f.verifiedOnly) q = q.eq('verified', true);
    if (f.category) q = q.contains('interests', [f.category]);
    const { data, error } = await q;
    fail(error);
    const profiles = (data ?? []).map((r) => this.profile(r));
    const posts = profiles.length ? (await this.sb.from('posts').select('author_id, like_count, comment_count, save_count, share_count, view_count, disclosure, category').in('author_id', profiles.map((p) => p.id)).eq('status', 'published').limit(2000)).data ?? [] : [];
    return profiles.map((p) => {
      const mine = posts.filter((x) => x.author_id === p.id);
      const rates = mine.filter((x) => Number(x.view_count) > 0).map((x) => (x.like_count + x.comment_count + x.save_count + x.share_count) / Number(x.view_count));
      return {
        profile: p, posts: mine.length,
        avgEngagementRate: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 10 : 0,
        disclosedShare: mine.length ? Math.round((mine.filter((x) => x.disclosure !== 'none').length / mine.length) * 100) : 0,
        categories: [...new Set(mine.map((x) => x.category as string | null).filter((x): x is string => !!x))],
      };
    });
  }
  private application(r: Row): CampaignApplication {
    return { id: r.id, campaignId: r.campaign_id, creatorId: r.creator_id, pitch: r.pitch, proposedFee: r.proposed_fee === null ? null : Number(r.proposed_fee), status: r.status, createdAt: r.created_at };
  }
  private invitation(r: Row): CampaignInvitation {
    return { id: r.id, campaignId: r.campaign_id, creatorId: r.creator_id, message: r.message, status: r.status, createdAt: r.created_at };
  }
  private participant(r: Row): CampaignParticipant {
    return { campaignId: r.campaign_id, creatorId: r.creator_id, source: r.source, agreedFee: r.agreed_fee === null ? null : Number(r.agreed_fee), status: r.status, joinedAt: r.joined_at };
  }
  private deliverable(r: Row): CampaignDeliverable {
    return { id: r.id, campaignId: r.campaign_id, creatorId: r.creator_id, postId: r.post_id, note: r.note, status: r.status, feedback: r.feedback, submittedAt: r.submitted_at };
  }
  async inviteCreator(campaignId: string, creatorId: string, message: string) {
    const { data, error } = await this.sb.rpc('invite_creator', { _campaign: campaignId, _creator: creatorId, _message: message });
    fail(error);
    const r = await this.sb.from('campaign_invitations').select('*').eq('id', data).single();
    fail(r.error);
    return this.invitation(r.data!);
  }
  private async orgCampaignIds(orgId: string) {
    return (await this.listCampaigns(orgId)).map((c) => c.id);
  }
  async listOrgInvitations(orgId: string) {
    const ids = await this.orgCampaignIds(orgId);
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('campaign_invitations').select('*').in('campaign_id', ids);
    fail(error);
    return (data ?? []).map((r) => this.invitation(r));
  }
  async listOrgApplications(orgId: string) {
    const ids = await this.orgCampaignIds(orgId);
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('campaign_applications').select('*').in('campaign_id', ids).neq('status', 'withdrawn').order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.application(r));
  }
  async reviewApplication(id: string, accept: boolean) {
    const { error } = await this.sb.rpc('review_application', { _app: id, _accept: accept });
    fail(error);
  }
  async listCampaignParticipants(campaignId: string) {
    const { data, error } = await this.sb.from('campaign_participants').select('*').eq('campaign_id', campaignId);
    fail(error);
    return (data ?? []).map((r) => this.participant(r));
  }
  async listOrgDeliverables(orgId: string) {
    const ids = await this.orgCampaignIds(orgId);
    if (!ids.length) return [];
    const { data, error } = await this.sb.from('campaign_deliverables').select('*').in('campaign_id', ids).order('submitted_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r) => this.deliverable(r));
  }
  async reviewDeliverable(id: string, approve: boolean, feedback: string) {
    const { error } = await this.sb.rpc('review_deliverable', { _d: id, _approve: approve, _feedback: feedback });
    fail(error);
  }
  async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance> {
    const [c, parts, dels] = await Promise.all([
      this.getCampaign(campaignId),
      this.listCampaignParticipants(campaignId),
      this.sb.from('campaign_deliverables').select('*, posts(view_count, like_count, comment_count, save_count, share_count)').eq('campaign_id', campaignId),
    ]);
    fail(dels.error);
    const approved = (dels.data ?? []).filter((x: Row) => x.status === 'approved');
    return {
      campaignId,
      participants: parts.filter((p) => p.status !== 'removed').length,
      deliverablesApproved: approved.length,
      deliverablesPending: (dels.data ?? []).filter((x: Row) => x.status === 'submitted').length,
      views: approved.reduce((s: number, x: Row) => s + Number(x.posts?.view_count ?? 0), 0),
      engagements: approved.reduce((s: number, x: Row) => s + (x.posts ? x.posts.like_count + x.posts.comment_count + x.posts.save_count + x.posts.share_count : 0), 0),
      // clicks & conversions are creator-private under RLS; aggregated brand reporting needs a server-side report function (Phase 6)
      productClicks: 0,
      confirmedConversions: 0,
      committedFees: c ? parts.reduce((s, p) => s + (p.agreedFee ?? 0), 0) : 0,
    };
  }
  async listOpenCampaigns() {
    const { data, error } = await this.sb.from('campaigns').select('*').eq('status', 'open').order('application_deadline', { ascending: true });
    fail(error);
    return (data ?? []).map((r) => this.campaign(r));
  }
  async applyToCampaign(campaignId: string, pitch: string, proposedFee: number | null) {
    const { data, error } = await this.sb.rpc('apply_to_campaign', { _campaign: campaignId, _creator: this.me(), _pitch: pitch, _fee: proposedFee });
    fail(error);
    const r = await this.sb.from('campaign_applications').select('*').eq('id', data).single();
    fail(r.error);
    return this.application(r.data!);
  }
  async withdrawApplication(id: string) {
    const { error } = await this.sb.rpc('withdraw_application', { _app: id });
    fail(error);
  }
  async listMyApplications() {
    const { data, error } = await this.sb.from('campaign_applications').select('*').eq('creator_id', this.me());
    fail(error);
    return (data ?? []).map((r) => this.application(r));
  }
  async listMyInvitations() {
    const { data, error } = await this.sb.from('campaign_invitations').select('*').eq('creator_id', this.me());
    fail(error);
    return (data ?? []).map((r) => this.invitation(r));
  }
  async respondInvitation(id: string, accept: boolean) {
    const { error } = await this.sb.rpc('respond_invitation', { _inv: id, _accept: accept });
    fail(error);
  }
  async listMyParticipations() {
    const { data, error } = await this.sb.from('campaign_participants').select('*').eq('creator_id', this.me());
    fail(error);
    return (data ?? []).map((r) => this.participant(r));
  }
  async listMyDeliverables() {
    const { data, error } = await this.sb.from('campaign_deliverables').select('*').eq('creator_id', this.me());
    fail(error);
    return (data ?? []).map((r) => this.deliverable(r));
  }
  async submitDeliverable(campaignId: string, postId: string, note: string) {
    const { data, error } = await this.sb.rpc('submit_deliverable', { _campaign: campaignId, _creator: this.me(), _post: postId, _note: note });
    fail(error);
    const r = await this.sb.from('campaign_deliverables').select('*').eq('id', data).single();
    fail(r.error);
    return this.deliverable(r.data!);
  }

  // ---------- Safety ----------
  async report(targetType: ReportTarget, targetId: string, reason: ReportReason, details: string) {
    const me = this.me();
    const { data, error } = await this.sb.from('moderation_reports').insert({ reporter_id: me, target_type: targetType, target_id: targetId, reason, details }).select('*').single();
    if (error?.code === '23505') {
      return { id: 'existing', reporterId: me, targetType, targetId, reason, details, status: 'open', createdAt: new Date().toISOString() } as ModerationReport;
    }
    fail(error);
    return { id: data!.id, reporterId: me, targetType, targetId, reason, details, status: data!.status, createdAt: data!.created_at };
  }
}
