import { DemoRepository } from './DemoRepository';
import { __fresh, __setDB, getDB } from './store';
import { AppError } from '../errors';

let viewer: string | null = 'p_noah';
const repo = new DemoRepository(() => viewer, 0);

beforeEach(() => {
  localStorage.clear();
  __setDB(__fresh());
  viewer = 'p_noah';
});

const code = async (p: Promise<unknown>) => {
  try { await p; return 'ok'; } catch (e) { return (e as AppError).code; }
};

describe('DemoRepository rules', () => {
  it('requires auth for mutations', async () => {
    viewer = null;
    expect(await code(repo.like('po_1'))).toBe('auth_required');
    expect(await code(repo.follow('p_elif'))).toBe('auth_required');
  });

  it('likes are idempotent and counted once', async () => {
    const before = (await repo.getPost('po_1'))!.likeCount;
    await repo.like('po_1');
    await repo.like('po_1');
    expect((await repo.getPost('po_1'))!.likeCount).toBe(before + 1);
    await repo.unlike('po_1');
    await repo.unlike('po_1');
    expect((await repo.getPost('po_1'))!.likeCount).toBe(before);
  });

  it('follow creates a notification for the followee', async () => {
    await repo.follow('p_mert');
    viewer = 'p_mert';
    const n = await repo.listNotifications();
    expect(n.some((x) => x.type === 'follow' && x.actorId === 'p_noah')).toBe(true);
  });

  it('blocking hides posts both ways and removes follows', async () => {
    await repo.follow('p_mert');
    await repo.block('p_mert');
    expect(await repo.getFollowingIds()).not.toContain('p_mert');
    expect((await repo.listPostsByAuthor('p_mert')).length).toBe(0);
    viewer = 'p_mert';
    expect(await repo.getPost(getDB().posts.find((p) => p.authorId === 'p_noah')!.id)).toBeNull();
  });

  it('cannot delete someone else’s post', async () => {
    expect(await code(repo.deletePost('po_1'))).toBe('forbidden');
  });

  it('validates tag coordinates on post creation', async () => {
    const media = [{ type: 'image' as const, url: 'data:,', width: 10, height: 10, alt: 'x' }];
    expect(await code(repo.createPost({ type: 'photo', media, caption: '', tags: [{ productId: 'pr_watch', mediaIndex: 0, x: 1.5, y: 0.5 }], disclosure: 'affiliate', category: null, status: 'published', scheduledAt: null }))).toBe('validation');
    const ok = await repo.createPost({ type: 'photo', media, caption: 'hi #Test @elif.stil', tags: [{ productId: 'pr_watch', mediaIndex: 0, x: 0.5, y: 0.5 }], disclosure: 'affiliate', category: null, status: 'published', scheduledAt: null });
    expect(ok.hashtags).toEqual(['test']);
    viewer = 'p_elif';
    expect((await repo.listNotifications()).some((n) => n.type === 'mention' && n.postId === ok.id)).toBe(true);
  });

  it('DM requests: non-followed sender limited to 3 messages until accepted', async () => {
    const c = await repo.startConversation('p_lara', 'personal');
    for (let i = 0; i < 3; i++) await repo.sendMessage(c.id, `m${i}`);
    expect(await code(repo.sendMessage(c.id, 'm4'))).toBe('rate_limited');
    viewer = 'p_lara';
    expect((await repo.getConversation(c.id))!.status).toBe('request');
    await repo.sendMessage(c.id, 'reply');
    expect((await repo.getConversation(c.id))!.status).toBe('active');
    viewer = 'p_can';
    expect(await code(repo.listMessages(c.id))).toBe('forbidden');
  });

  it('collaboration threads require a brand participant', async () => {
    expect(await code(repo.startConversation('p_elif', 'collaboration'))).toBe('forbidden');
    expect(await code(repo.startConversation('b_lumora', 'collaboration'))).toBe('ok');
  });

  it('collections are private to their owner', async () => {
    const col = await repo.createCollection('Wishlist', true);
    await repo.addToCollection(col.id, 'post', 'po_1');
    await repo.addToCollection(col.id, 'post', 'po_1');
    expect((await repo.getCollection(col.id))!.items.length).toBe(1);
    viewer = 'p_can';
    expect(await repo.getCollection(col.id)).toBeNull();
    expect(await code(repo.addToCollection(col.id, 'post', 'po_2'))).toBe('forbidden');
  });

  it('outbound click is logged but never treated as a sale; no destination without authorized link', async () => {
    const r = await repo.recordOutboundClick('of_w1', 'po_1', 'p_elif');
    expect(r.destination).toBeNull();
    expect(getDB().clicks).toHaveLength(1);
    expect(getDB().conversions).toHaveLength(0);
    expect(getDB().ledger).toHaveLength(0);
  });

  it('self-clicks are not attributed to the creator', async () => {
    viewer = 'p_elif';
    const r = await repo.recordOutboundClick('of_w1', 'po_1', 'p_elif');
    expect(r.click!.creatorId).toBeNull();
  });

  it('reports are de-duplicated while open', async () => {
    const a = await repo.report('post', 'po_1', 'spam', '');
    const b = await repo.report('post', 'po_1', 'spam', '');
    expect(a.id).toBe(b.id);
  });

  it('product proposals require https and enter review', async () => {
    expect(await code(repo.proposeProduct({ brandName: 'X', title: 'Y', variant: null, url: 'http://x.com', gtin: null, category: 'tech', note: '' }))).toBe('invalid_url');
    const p = await repo.proposeProduct({ brandName: 'X', title: 'Y', variant: null, url: 'https://x.com/p', gtin: null, category: 'tech', note: '' });
    expect(p.status).toBe('pending_review');
    expect(await repo.getProduct(p.id)).toBeNull();
  });

  it('following feed only contains followed authors', async () => {
    await repo.follow('p_can');
    const followed = new Set([...(await repo.getFollowingIds()), 'p_noah']);
    const feed = await repo.getFeed({ mode: 'following' });
    expect(feed.every((p) => followed.has(p.authorId))).toBe(true);
    expect(feed.some((p) => p.authorId === 'p_can')).toBe(true);
    expect(feed.length).toBeGreaterThan(0);
  });

  it('muted accounts are excluded from feeds and notifications', async () => {
    viewer = 'p_elif';
    await repo.mute('p_zeynep');
    expect((await repo.getFeed({ mode: 'for_you' })).some((p) => p.authorId === 'p_zeynep')).toBe(false);
    viewer = 'p_zeynep';
    await repo.like('po_1');
    viewer = 'p_elif';
    expect((await repo.listNotifications()).some((n) => n.actorId === 'p_zeynep')).toBe(false);
  });
});
