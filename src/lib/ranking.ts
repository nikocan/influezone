import type { Post, Profile } from '@/data/types';

export interface RankingContext {
  viewerId: string | null;
  followingIds: Set<string>;
  interests: string[];
  country: string;
  blockedIds: Set<string>;
  now?: Date;
}

/**
 * Transparent feed ranking. Signals: relevance (interests/category), follows,
 * engagement quality, availability in viewer country, recency and policy compliance.
 * Removed / unpublished posts and blocked authors are excluded, never down-ranked.
 */
export function scorePost(post: Post, author: Profile | undefined, ctx: RankingContext): number {
  const now = (ctx.now ?? new Date()).getTime();
  const ageHours = Math.max(1, (now - new Date(post.createdAt).getTime()) / 36e5);
  const recency = 1 / Math.pow(ageHours / 24 + 1, 0.8);
  const views = Math.max(post.viewCount, 1);
  const engagementRate = (post.likeCount + 2 * post.commentCount + 3 * post.saveCount + 2 * post.shareCount) / views;
  const engagement = Math.min(1, engagementRate * 5);
  const follow = ctx.followingIds.has(post.authorId) ? 1 : 0;
  const interest = post.category && ctx.interests.includes(post.category) ? 1 : 0;
  const local = !post.country || post.country === ctx.country ? 1 : 0.4;
  const quality = author?.verified ? 0.1 : 0;
  return (0.3 * recency + 0.25 * engagement + 0.2 * follow + 0.2 * interest + quality) * local;
}

export function isEligible(post: Post, ctx: RankingContext): boolean {
  return post.status === 'published' && !ctx.blockedIds.has(post.authorId);
}

export function rankFeed(posts: Post[], authors: Map<string, Profile>, ctx: RankingContext): Post[] {
  return posts
    .filter((p) => isEligible(p, ctx))
    .map((p) => ({ p, s: scorePost(p, authors.get(p.authorId), ctx) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
