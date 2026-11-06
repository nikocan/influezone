/**
 * Demo-mode brand portal rules. Mirrors supabase/migrations/20261106000006_brand_campaigns.sql:
 * org-role checks, campaign status machine, eligibility, disclosure-checked deliverables.
 */
import type { DemoDB } from './store';
import type {
  Campaign, CampaignInput, CampaignStatus, CreatorCard, CreatorDiscoveryFilters, CampaignPerformance, OrgRole, Organization, Product, NewProductInput,
  CampaignApplication, CampaignInvitation, CampaignDeliverable,
} from '../types';
import { AppError } from '../errors';
import { uid } from '@/lib/utils';

const RANK: OrgRole[] = ['member', 'analyst', 'manager', 'admin', 'owner'];
const now = () => new Date().toISOString();

export function roleOf(d: DemoDB, orgId: string, userId: string): OrgRole | null {
  return d.orgMembers.find((m) => m.orgId === orgId && m.userId === userId)?.role ?? null;
}

export function requireRole(d: DemoDB, orgId: string, userId: string, min: OrgRole) {
  const r = roleOf(d, orgId, userId);
  if (!r || RANK.indexOf(r) < RANK.indexOf(min)) throw new AppError('forbidden');
}

export function isStaff(d: DemoDB, userId: string) {
  return d.accounts.find((a) => a.id === userId)?.roles.some((r) => r === 'admin' || r === 'moderator') ?? false;
}

export function registerBrand(d: DemoDB, me: string, input: { name: string; slug: string; country: string; website: string | null; username: string }): Organization {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new AppError('validation');
  if (!/^[a-z0-9-]{3,60}$/.test(input.slug)) throw new AppError('validation');
  if (d.organizations.some((o) => o.slug === input.slug)) throw new AppError('slug_taken');
  if (!/^[a-z0-9_.]{3,30}$/.test(input.username)) throw new AppError('invalid_username');
  if (d.profiles.some((p) => p.username === input.username)) throw new AppError('username_taken');
  if (input.website && !/^https:\/\//.test(input.website)) throw new AppError('invalid_url');
  const orgId = uid('org');
  const profileId = uid('b');
  d.profiles.push({
    id: profileId, username: input.username, displayName: name, avatarUrl: null, bio: '', country: input.country, locale: 'tr', kind: 'brand', isCreator: false, verified: false,
    website: input.website, interests: [], onboardingCompleted: true, isPrivate: false, followerCount: 0, followingCount: 0, postCount: 0, createdAt: now(), isSample: false,
  });
  const org: Organization = { id: orgId, name, slug: input.slug, website: input.website, country: input.country, verificationStatus: 'unverified', brandProfileId: profileId, createdAt: now(), isSample: false };
  d.organizations.push(org);
  d.orgMembers.push({ orgId, userId: me, role: 'owner' });
  return org;
}

export function createProduct(d: DemoDB, me: string, orgId: string, input: NewProductInput): Product {
  requireRole(d, orgId, me, 'manager');
  if (input.title.trim().length < 2) throw new AppError('validation');
  if (input.gtin && !/^[0-9]{8,14}$/.test(input.gtin)) throw new AppError('validation');
  const org = d.organizations.find((o) => o.id === orgId)!;
  const p: Product = {
    id: uid('pr'), brandProfileId: org.brandProfileId, brandName: org.name, title: input.title.trim(), variant: input.variant, description: input.description, category: input.category,
    images: input.imageUrl ? [input.imageUrl] : [], gtin: input.gtin, countries: input.countries, status: 'pending_review', isSample: false,
  };
  (p as Product & { organizationId?: string }).organizationId = orgId;
  d.products.push(p);
  return p;
}

export function orgProducts(d: DemoDB, orgId: string): Product[] {
  const org = d.organizations.find((o) => o.id === orgId);
  return d.products.filter((p) => (p as Product & { organizationId?: string }).organizationId === orgId || (org?.brandProfileId && p.brandProfileId === org.brandProfileId));
}

function validateCampaign(input: CampaignInput) {
  if (input.title.trim().length < 3) throw new AppError('validation');
  if (input.type === 'affiliate' && !input.commissionBps) throw new AppError('validation');
  if (input.type === 'fixed_fee' && !input.fixedFee) throw new AppError('validation');
  if (input.type === 'hybrid' && (!input.fixedFee || !input.commissionBps)) throw new AppError('validation');
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new AppError('validation');
  if (input.deliverables.length === 0) throw new AppError('validation');
}

export function saveCampaign(d: DemoDB, me: string, orgId: string, input: CampaignInput, id?: string): Campaign {
  requireRole(d, orgId, me, 'manager');
  validateCampaign(input);
  const org = d.organizations.find((o) => o.id === orgId)!;
  if (id) {
    const c = d.campaigns.find((x) => x.id === id && x.organizationId === orgId);
    if (!c) throw new AppError('not_found');
    if (c.status !== 'draft') {
      const locked: (keyof CampaignInput)[] = ['type', 'currency', 'budget', 'fixedFee', 'commissionBps', 'requiredDisclosure', 'minFollowers'];
      if (locked.some((k) => JSON.stringify(c[k]) !== JSON.stringify(input[k]))) throw new AppError('forbidden');
    }
    Object.assign(c, input);
    return c;
  }
  const c: Campaign = { ...input, id: uid('cmp'), organizationId: orgId, brandProfileId: org.brandProfileId, status: 'draft', rejectionNote: null, createdAt: now(), isSample: false };
  d.campaigns.push(c);
  return c;
}

const BRAND_TRANSITIONS: [CampaignStatus, CampaignStatus][] = [
  ['draft', 'pending_approval'], ['pending_approval', 'draft'], ['open', 'paused'], ['paused', 'open'], ['open', 'in_progress'], ['paused', 'in_progress'],
  ['in_progress', 'completed'], ['draft', 'cancelled'], ['pending_approval', 'cancelled'], ['open', 'cancelled'], ['paused', 'cancelled'], ['in_progress', 'cancelled'],
];

export function setStatus(d: DemoDB, me: string, id: string, status: CampaignStatus, note?: string): Campaign {
  const c = d.campaigns.find((x) => x.id === id);
  if (!c) throw new AppError('not_found');
  if (isStaff(d, me) && c.status === 'pending_approval' && (status === 'open' || status === 'draft')) {
    c.status = status;
    c.rejectionNote = status === 'draft' ? note ?? null : null;
    return c;
  }
  requireRole(d, c.organizationId, me, 'manager');
  if (!BRAND_TRANSITIONS.some(([a, b]) => a === c.status && b === status)) throw new AppError('invalid_transition');
  c.status = status;
  return c;
}

export function eligible(d: DemoDB, c: Campaign, creatorId: string) {
  const p = d.profiles.find((x) => x.id === creatorId);
  if (!p || p.kind !== 'person' || !p.isCreator) return false;
  if (d.orgMembers.some((m) => m.orgId === c.organizationId && m.userId === creatorId)) return false; // conflict of interest
  const followers = p.isSample ? p.followerCount : d.follows.filter((f) => f.followeeId === p.id).length;
  return followers >= c.minFollowers && (c.countries.length === 0 || c.countries.includes(p.country));
}

export function apply(d: DemoDB, me: string, campaignId: string, pitch: string, fee: number | null): CampaignApplication {
  const c = d.campaigns.find((x) => x.id === campaignId);
  if (!c || c.status !== 'open') throw new AppError('campaign_not_open');
  if (c.applicationDeadline && c.applicationDeadline < now()) throw new AppError('campaign_not_open');
  if (!eligible(d, c, me)) throw new AppError('not_eligible');
  if (pitch.length > 2000 || (fee !== null && !(fee > 0))) throw new AppError('validation');
  const existing = d.applications.find((a) => a.campaignId === campaignId && a.creatorId === me);
  if (existing && existing.status !== 'withdrawn') throw new AppError('already_applied');
  if (existing) {
    Object.assign(existing, { pitch, proposedFee: fee, status: 'pending', createdAt: now() });
    return existing;
  }
  const a: CampaignApplication = { id: uid('app'), campaignId, creatorId: me, pitch, proposedFee: fee, status: 'pending', createdAt: now() };
  d.applications.push(a);
  return a;
}

export function reviewApplication(d: DemoDB, me: string, id: string, accept: boolean) {
  const a = d.applications.find((x) => x.id === id);
  if (!a) throw new AppError('not_found');
  const c = d.campaigns.find((x) => x.id === a.campaignId)!;
  requireRole(d, c.organizationId, me, 'manager');
  if (a.status !== 'pending') throw new AppError('invalid_transition');
  a.status = accept ? 'accepted' : 'rejected';
  if (accept && !d.participants.some((p) => p.campaignId === c.id && p.creatorId === a.creatorId)) {
    d.participants.push({ campaignId: c.id, creatorId: a.creatorId, source: 'application', agreedFee: a.proposedFee ?? c.fixedFee, status: 'active', joinedAt: now() });
  }
  d.notifications.unshift({ id: uid('n'), userId: a.creatorId, type: 'system', actorId: c.brandProfileId, postId: null, body: `${accept ? '✅' : '❌'} ${c.title}`, read: false, createdAt: now() });
}

export function invite(d: DemoDB, me: string, campaignId: string, creatorId: string, message: string): CampaignInvitation {
  const c = d.campaigns.find((x) => x.id === campaignId);
  if (!c) throw new AppError('not_found');
  requireRole(d, c.organizationId, me, 'manager');
  if (!['open', 'in_progress', 'paused'].includes(c.status)) throw new AppError('campaign_not_open');
  if (!eligible(d, c, creatorId)) throw new AppError('not_eligible');
  if (d.invitations.some((i) => i.campaignId === campaignId && i.creatorId === creatorId)) throw new AppError('already_applied');
  const inv: CampaignInvitation = { id: uid('inv'), campaignId, creatorId, message: message.slice(0, 1000), status: 'sent', createdAt: now() };
  d.invitations.push(inv);
  d.notifications.unshift({ id: uid('n'), userId: creatorId, type: 'system', actorId: c.brandProfileId, postId: null, body: `📩 ${c.title}`, read: false, createdAt: now() });
  return inv;
}

export function respondInvitation(d: DemoDB, me: string, id: string, accept: boolean) {
  const i = d.invitations.find((x) => x.id === id);
  if (!i || i.creatorId !== me) throw new AppError('forbidden');
  if (i.status !== 'sent') throw new AppError('invalid_transition');
  const c = d.campaigns.find((x) => x.id === i.campaignId)!;
  if (accept && !['open', 'in_progress', 'paused'].includes(c.status)) throw new AppError('campaign_not_open');
  i.status = accept ? 'accepted' : 'declined';
  if (accept && !d.participants.some((p) => p.campaignId === c.id && p.creatorId === me)) {
    d.participants.push({ campaignId: c.id, creatorId: me, source: 'invitation', agreedFee: c.fixedFee, status: 'active', joinedAt: now() });
  }
}

export function submitDeliverable(d: DemoDB, me: string, campaignId: string, postId: string, note: string): CampaignDeliverable {
  if (!d.participants.some((p) => p.campaignId === campaignId && p.creatorId === me && p.status === 'active')) throw new AppError('not_participant');
  const c = d.campaigns.find((x) => x.id === campaignId)!;
  const post = d.posts.find((p) => p.id === postId);
  if (!post || post.authorId !== me || post.status !== 'published') throw new AppError('validation');
  if (post.disclosure !== c.requiredDisclosure) throw new AppError('disclosure_mismatch');
  const existing = d.deliverables.find((x) => x.campaignId === campaignId && x.postId === postId);
  if (existing && existing.status !== 'changes_requested') throw new AppError('already_applied');
  if (existing) {
    Object.assign(existing, { status: 'submitted', note, feedback: null, submittedAt: now() });
    return existing;
  }
  const del: CampaignDeliverable = { id: uid('del'), campaignId, creatorId: me, postId, note: note.slice(0, 1000), status: 'submitted', feedback: null, submittedAt: now() };
  d.deliverables.push(del);
  return del;
}

export function reviewDeliverable(d: DemoDB, me: string, id: string, approve: boolean, feedback: string) {
  const del = d.deliverables.find((x) => x.id === id);
  if (!del) throw new AppError('not_found');
  const c = d.campaigns.find((x) => x.id === del.campaignId)!;
  requireRole(d, c.organizationId, me, 'manager');
  if (del.status !== 'submitted') throw new AppError('invalid_transition');
  del.status = approve ? 'approved' : 'changes_requested';
  del.feedback = feedback || null;
}

export function discover(d: DemoDB, f: CreatorDiscoveryFilters, blocked: Set<string>): CreatorCard[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return d.profiles
    .filter((p) => p.kind === 'person' && p.isCreator && !blocked.has(p.id))
    .filter((p) => !q || `${p.username} ${p.displayName} ${p.bio}`.toLowerCase().includes(q))
    .filter((p) => (!f.country || p.country === f.country) && (!f.verifiedOnly || p.verified) && (!f.category || p.interests.includes(f.category)))
    .map((p) => {
      const followers = p.isSample ? p.followerCount + d.follows.filter((x) => x.followeeId === p.id).length : d.follows.filter((x) => x.followeeId === p.id).length;
      const posts = d.posts.filter((x) => x.authorId === p.id && x.status === 'published');
      const rates = posts.filter((x) => x.viewCount > 0).map((x) => (x.likeCount + x.commentCount + x.saveCount + x.shareCount) / x.viewCount);
      return {
        profile: { ...p, followerCount: followers, postCount: posts.length },
        posts: posts.length,
        avgEngagementRate: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 10 : 0,
        disclosedShare: posts.length ? Math.round((posts.filter((x) => x.disclosure !== 'none').length / posts.length) * 100) : 0,
        categories: [...new Set(posts.map((x) => x.category).filter((x): x is string => !!x))],
      };
    })
    .filter((c) => c.profile.followerCount >= (f.minFollowers ?? 0))
    .sort((a, b) => b.profile.followerCount - a.profile.followerCount);
}

export function performance(d: DemoDB, campaignId: string): CampaignPerformance {
  const c = d.campaigns.find((x) => x.id === campaignId)!;
  const parts = d.participants.filter((p) => p.campaignId === campaignId && p.status !== 'removed');
  const dels = d.deliverables.filter((x) => x.campaignId === campaignId);
  const approvedPosts = dels.filter((x) => x.status === 'approved').map((x) => d.posts.find((p) => p.id === x.postId)).filter((p): p is NonNullable<typeof p> => !!p);
  const creatorIds = new Set(parts.map((p) => p.creatorId));
  const offerIds = new Set(d.offers.filter((o) => c.productIds.includes(o.productId)).map((o) => o.id));
  const convs = d.conversions.filter((x) => x.creatorId && creatorIds.has(x.creatorId) && x.offerId && offerIds.has(x.offerId) && (x.status === 'confirmed' || x.status === 'approved'));
  return {
    campaignId,
    participants: parts.length,
    deliverablesApproved: dels.filter((x) => x.status === 'approved').length,
    deliverablesPending: dels.filter((x) => x.status === 'submitted').length,
    views: approvedPosts.reduce((s, p) => s + p.viewCount, 0),
    engagements: approvedPosts.reduce((s, p) => s + p.likeCount + p.commentCount + p.saveCount + p.shareCount, 0),
    productClicks: d.clicks.filter((x) => x.creatorId && creatorIds.has(x.creatorId) && offerIds.has(x.offerId)).length,
    confirmedConversions: convs.length,
    committedFees: parts.reduce((s, p) => s + (p.agreedFee ?? 0), 0),
  };
}

