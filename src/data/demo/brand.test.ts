import { DemoRepository } from './DemoRepository';
import { __fresh, __setDB, mutate } from './store';
import type { AppError } from '../errors';
import type { CampaignInput } from '../types';

let viewer: string | null = null;
const repo = new DemoRepository(() => viewer, 0);
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return (e as AppError).code; } };

const input: CampaignInput = {
  title: 'Autumn launch', objective: 'launch', brief: '', type: 'fixed_fee', currency: 'TRY', budget: 50000, fixedFee: 5000, commissionBps: null, countries: ['TR'], categories: [],
  minFollowers: 1000, deliverables: [{ kind: 'post', count: 1 }], requiredDisclosure: 'sponsored', productIds: [], applicationDeadline: null, startsAt: null, endsAt: null,
};

beforeEach(() => {
  localStorage.clear();
  __setDB(__fresh());
  mutate((d) => {
    d.accounts.push({ id: 'p_noah', email: 'n@x', passwordHash: '', emailVerified: true, createdAt: '', roles: ['shopper'] });
    d.accounts.push({ id: 'p_can', email: 'mod@x', passwordHash: '', emailVerified: true, createdAt: '', roles: ['shopper', 'moderator'] });
  });
  viewer = 'p_noah';
});

async function setupOrg() {
  const org = await repo.registerBrand({ name: 'Acme', slug: 'acme', country: 'TR', website: null, username: 'acmebrand' });
  const c = await repo.saveCampaign(org.id, input);
  return { org, c };
}

describe('brand portal rules (demo)', () => {
  it('registration creates org, brand profile and owner membership; slugs are unique', async () => {
    const { org } = await setupOrg();
    expect((await repo.listMyOrganizations())[0]).toMatchObject({ role: 'owner', organization: { id: org.id, verificationStatus: 'unverified' } });
    expect(await repo.getProfileByUsername('acmebrand')).toMatchObject({ kind: 'brand' });
    expect(await code(repo.registerBrand({ name: 'Acme 2', slug: 'acme', country: 'TR', website: null, username: 'acme2' }))).toBe('slug_taken');
  });

  it('other organisations are isolated', async () => {
    const { org, c } = await setupOrg();
    viewer = 'p_lara';
    expect(await code(repo.listCampaigns(org.id))).toBe('forbidden');
    expect(await repo.getCampaign(c.id)).toBeNull();
    expect(await code(repo.setCampaignStatus(c.id, 'pending_approval'))).toBe('forbidden');
  });

  it('analysts can read but not manage', async () => {
    const { org } = await setupOrg();
    await repo.addOrgMember(org.id, 'lara.home', 'analyst');
    viewer = 'p_lara';
    expect(await repo.listCampaigns(org.id)).toHaveLength(1);
    expect(await code(repo.saveCampaign(org.id, input))).toBe('forbidden');
    expect(await code(repo.addOrgMember(org.id, 'can.moves', 'admin'))).toBe('forbidden');
  });

  it('status machine: brand cannot self-approve; staff approves; terms lock after submission', async () => {
    const { c, org } = await setupOrg();
    expect(await code(repo.setCampaignStatus(c.id, 'open'))).toBe('invalid_transition');
    await repo.setCampaignStatus(c.id, 'pending_approval');
    expect(await code(repo.saveCampaign(org.id, { ...input, fixedFee: 1 }, c.id))).toBe('forbidden');
    viewer = 'p_can';
    expect((await repo.setCampaignStatus(c.id, 'open')).status).toBe('open');
    viewer = 'p_noah';
    await repo.setCampaignStatus(c.id, 'in_progress');
    expect(await code(repo.setCampaignStatus(c.id, 'open'))).toBe('invalid_transition');
  });

  it('applications: eligibility, duplicates, conflict of interest, acceptance creates participant', async () => {
    const { c } = await setupOrg();
    await repo.setCampaignStatus(c.id, 'pending_approval');
    viewer = 'p_can';
    await repo.setCampaignStatus(c.id, 'open');
    viewer = 'p_noah';
    mutate((d) => { d.profiles.find((p) => p.id === 'p_noah')!.isCreator = true; });
    expect(await code(repo.applyToCampaign(c.id, 'me', null))).toBe('not_eligible'); // own org
    viewer = 'p_lara'; // GB creator, campaign targets TR
    expect(await code(repo.applyToCampaign(c.id, 'hi', null))).toBe('not_eligible');
    viewer = 'p_elif';
    const app = await repo.applyToCampaign(c.id, 'I love autumn', 4500);
    expect(await code(repo.applyToCampaign(c.id, 'again', null))).toBe('already_applied');
    expect(await code(repo.reviewApplication(app.id, true))).toBe('forbidden');
    viewer = 'p_noah';
    await repo.reviewApplication(app.id, true);
    expect(await repo.listCampaignParticipants(c.id)).toMatchObject([{ creatorId: 'p_elif', agreedFee: 4500, source: 'application' }]);
  });

  it('deliverables must carry the required disclosure; brand reviews', async () => {
    const { c } = await setupOrg();
    await repo.setCampaignStatus(c.id, 'pending_approval');
    viewer = 'p_can';
    await repo.setCampaignStatus(c.id, 'open');
    viewer = 'p_noah';
    await repo.inviteCreator(c.id, 'p_zeynep', 'join us');
    viewer = 'p_zeynep';
    const inv = (await repo.listMyInvitations())[0]!;
    await repo.respondInvitation(inv.id, true);
    const media = [{ type: 'image' as const, url: 'data:,', width: 10, height: 10, alt: 'x' }];
    const plain = await repo.createPost({ type: 'photo', media, caption: 'no ad', tags: [], disclosure: 'none', category: null, status: 'published', scheduledAt: null });
    const ad = await repo.createPost({ type: 'photo', media, caption: 'ad', tags: [], disclosure: 'sponsored', category: null, status: 'published', scheduledAt: null });
    expect(await code(repo.submitDeliverable(c.id, plain.id, ''))).toBe('disclosure_mismatch');
    expect(await code(repo.submitDeliverable(c.id, 'po_1', ''))).toBe('validation'); // someone else's post
    const del = await repo.submitDeliverable(c.id, ad.id, 'done');
    viewer = 'p_elif';
    expect(await code(repo.submitDeliverable(c.id, ad.id, ''))).toBe('not_participant');
    viewer = 'p_noah';
    await repo.reviewDeliverable(del.id, true, 'great');
    const perf = await repo.getCampaignPerformance(c.id);
    expect(perf).toMatchObject({ participants: 1, deliverablesApproved: 1, committedFees: 5000 });
  });

  it('owner cannot be removed or reassigned', async () => {
    const { org } = await setupOrg();
    expect(await code(repo.removeOrgMember(org.id, 'p_noah'))).toBe('forbidden');
  });

  it('sample campaigns are visible to creators and labelled', async () => {
    viewer = 'p_elif';
    const open = await repo.listOpenCampaigns();
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((c) => c.isSample)).toBe(true);
  });
});
