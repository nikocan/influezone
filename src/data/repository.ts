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
  EarningsSummary,
  Payout,
  PayoutAccount,
  AppNotification,
  ClickEvent,
  Collection,
  Comment,
  Conversation,
  FeedQuery,
  Marketplace,
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
} from './types';

/**
 * Provider-agnostic data contract. Implemented by:
 *  - DemoRepository: in-browser sample data (clearly labelled), used when Supabase isn't configured.
 *  - SupabaseRepository: Postgres + RLS via supabase-js.
 * All authorization is enforced server-side in Supabase (RLS). The demo adapter mirrors the
 * same rules so behaviour is identical, but it is NOT a security boundary.
 */
export interface Repository {
  readonly mode: 'demo' | 'supabase';

  // Profiles
  getProfile(id: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  getProfiles(ids: string[]): Promise<Profile[]>;
  updateMyProfile(patch: ProfileUpdate): Promise<Profile>;
  isUsernameAvailable(username: string): Promise<boolean>;
  listTrendingCreators(limit?: number): Promise<Profile[]>;
  listBrands(limit?: number): Promise<Profile[]>;
  listSuggestedCreators(limit?: number): Promise<Profile[]>;

  // Social graph
  follow(profileId: string): Promise<void>;
  unfollow(profileId: string): Promise<void>;
  getFollowingIds(): Promise<string[]>;
  listFollowers(profileId: string): Promise<Profile[]>;
  listFollowing(profileId: string): Promise<Profile[]>;
  block(profileId: string): Promise<void>;
  unblock(profileId: string): Promise<void>;
  mute(profileId: string): Promise<void>;
  unmute(profileId: string): Promise<void>;
  getBlockedIds(): Promise<string[]>;
  getMutedIds(): Promise<string[]>;

  // Posts
  getFeed(q: FeedQuery): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  listPostsByAuthor(authorId: string): Promise<Post[]>;
  listPostsByHashtag(tag: string): Promise<Post[]>;
  listPostsByProduct(productId: string): Promise<Post[]>;
  listMyDrafts(): Promise<Post[]>;
  createPost(input: NewPostInput): Promise<Post>;
  deletePost(id: string): Promise<void>;
  recordView(postId: string): Promise<void>;
  recordShare(postId: string): Promise<void>;
  listTrendingHashtags(limit?: number): Promise<{ tag: string; count: number }[]>;

  // Likes
  getLikedPostIds(): Promise<string[]>;
  like(postId: string): Promise<void>;
  unlike(postId: string): Promise<void>;
  listLikers(postId: string): Promise<Profile[]>;

  // Comments
  listComments(postId: string): Promise<Comment[]>;
  addComment(postId: string, body: string, parentId?: string | null): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Collections
  listCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | null>;
  createCollection(name: string, isPrivate: boolean): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  addToCollection(collectionId: string, kind: 'post' | 'product', refId: string): Promise<void>;
  removeFromCollection(collectionId: string, kind: 'post' | 'product', refId: string): Promise<void>;

  // Notifications
  listNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(ids?: string[]): Promise<void>;

  // Messaging
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
  startConversation(otherId: string, kind: 'personal' | 'collaboration'): Promise<Conversation>;
  acceptConversation(id: string): Promise<void>;

  // Commerce (read + authorized redirect logging)
  getProduct(id: string): Promise<Product | null>;
  getProducts(ids: string[]): Promise<Product[]>;
  searchProducts(q: string, category?: string | null): Promise<Product[]>;
  listTrendingProducts(limit?: number): Promise<Product[]>;
  listSimilarProducts(productId: string, limit?: number): Promise<Product[]>;
  listOffers(productId: string): Promise<Offer[]>;
  listMarketplaces(): Promise<Marketplace[]>;
  proposeProduct(p: ProductProposal): Promise<Product>;
  /** Logs a click (never a sale) and returns the authorized merchant destination, or null when not configured. */
  recordOutboundClick(offerId: string, postId: string | null, creatorId: string | null): Promise<{ destination: string | null; click: ClickEvent | null }>;
  listPriceAlerts(): Promise<PriceAlert[]>;
  createPriceAlert(productId: string, targetPrice: number, currency: string): Promise<PriceAlert>;
  deletePriceAlert(id: string): Promise<void>;

  // Search
  search(q: string, filters: SearchFilters): Promise<SearchResults>;

  // Monetisation (creator). Money only moves server-side; these are reads + requests.
  listAffiliateLinks(): Promise<AffiliateLink[]>;
  createAffiliateLink(offerId: string): Promise<AffiliateLink>;
  getEarningsSummary(): Promise<EarningsSummary>;
  listConversions(status?: ConversionStatus | 'all'): Promise<Conversion[]>;
  getClickStats(): Promise<ClickStat[]>;
  getPayoutAccount(): Promise<PayoutAccount>;
  listPayouts(): Promise<Payout[]>;
  requestPayout(currency: string, amount: number): Promise<Payout>;
  /** DEMO ONLY: imports a clearly labelled sample network report (idempotent). */
  importSampleConversionReport?(): Promise<{ imported: number; duplicates: number; rejected: number; updated: number; released: number }>;

  // Brand portal — organisation-scoped. Every call is authorised by membership role server-side.
  listMyOrganizations(): Promise<OrgMembership[]>;
  registerBrand(input: { name: string; slug: string; country: string; website: string | null; username: string }): Promise<Organization>;
  updateOrganization(orgId: string, patch: { name?: string; website?: string | null; country?: string }): Promise<Organization>;
  listOrgMembers(orgId: string): Promise<OrgMember[]>;
  addOrgMember(orgId: string, username: string, role: Exclude<OrgRole, 'owner'>): Promise<void>;
  removeOrgMember(orgId: string, userId: string): Promise<void>;
  listOrgProducts(orgId: string): Promise<Product[]>;
  createOrgProduct(orgId: string, input: NewProductInput): Promise<Product>;
  listCampaigns(orgId: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  saveCampaign(orgId: string, input: CampaignInput, id?: string): Promise<Campaign>;
  setCampaignStatus(id: string, status: CampaignStatus, note?: string): Promise<Campaign>;
  discoverCreators(filters: CreatorDiscoveryFilters): Promise<CreatorCard[]>;
  inviteCreator(campaignId: string, creatorId: string, message: string): Promise<CampaignInvitation>;
  listOrgInvitations(orgId: string): Promise<CampaignInvitation[]>;
  listOrgApplications(orgId: string): Promise<CampaignApplication[]>;
  reviewApplication(id: string, accept: boolean): Promise<void>;
  listCampaignParticipants(campaignId: string): Promise<CampaignParticipant[]>;
  listOrgDeliverables(orgId: string): Promise<CampaignDeliverable[]>;
  reviewDeliverable(id: string, approve: boolean, feedback: string): Promise<void>;
  getCampaignPerformance(campaignId: string): Promise<CampaignPerformance>;
  // Creator side of campaigns
  listOpenCampaigns(): Promise<Campaign[]>;
  applyToCampaign(campaignId: string, pitch: string, proposedFee: number | null): Promise<CampaignApplication>;
  withdrawApplication(id: string): Promise<void>;
  listMyApplications(): Promise<CampaignApplication[]>;
  listMyInvitations(): Promise<CampaignInvitation[]>;
  respondInvitation(id: string, accept: boolean): Promise<void>;
  listMyParticipations(): Promise<CampaignParticipant[]>;
  listMyDeliverables(): Promise<CampaignDeliverable[]>;
  submitDeliverable(campaignId: string, postId: string, note: string): Promise<CampaignDeliverable>;

  // Safety
  report(targetType: ReportTarget, targetId: string, reason: ReportReason, details: string): Promise<ModerationReport>;
}
