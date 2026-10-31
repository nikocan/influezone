import { rankFeed } from './ranking';
import { seedPosts, seedProfiles } from '@/data/demo/seed';

describe('feed ranking', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  const posts = seedPosts(now);
  const authors = new Map(seedProfiles().map((p) => [p.id, p]));
  it('excludes blocked authors and non-published posts', () => {
    const extra = { ...posts[0]!, id: 'draft', status: 'draft' as const };
    const r = rankFeed([...posts, extra], authors, { viewerId: 'x', followingIds: new Set(), interests: [], country: 'TR', blockedIds: new Set(['p_elif']), now: new Date(now) });
    expect(r.some((p) => p.authorId === 'p_elif' || p.id === 'draft')).toBe(false);
  });
  it('boosts followed authors and matching interests', () => {
    const base = { viewerId: 'x', interests: [] as string[], country: 'TR', blockedIds: new Set<string>(), now: new Date(now) };
    const plain = rankFeed(posts, authors, { ...base, followingIds: new Set() });
    const followed = rankFeed(posts, authors, { ...base, followingIds: new Set(['p_noah']), interests: ['fashion'] });
    expect(followed.findIndex((p) => p.authorId === 'p_noah')).toBeLessThan(plain.findIndex((p) => p.authorId === 'p_noah'));
  });
});
