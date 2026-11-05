/**
 * Domain types shared by the demo adapter and the Supabase adapter.
 * Field names are camelCase on the client; the Supabase adapter maps snake_case columns.
 */

export type PlatformRole = 'shopper' | 'creator' | 'brand' | 'admin' | 'moderator';
export type OrgRole = 'owner' | 'admin' | 'manager' | 'analyst' | 'member';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  country: string;
  locale: string;
  kind: 'person' | 'brand';
  isCreator: boolean;
  /** Only set after a real verification workflow (admin-approved). */
  verified: boolean;
  website: string | null;
  interests: string[];
  onboardingCompleted: boolean;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  /** true for seeded sample accounts shown in demo mode */
  isSample: boolean;
}

export type MediaType = 'image' | 'video';

export interface Media {
  id: string;
  type: MediaType;
  url: string;
  posterUrl?: string | null;
  width: number;
  height: number;
  alt: string;
  captionsUrl?: string | null;
}

/** Product tag with coordinates normalized to 0..1 of the media's intrinsic box. */
export interface ProductTagPlacement {
  id: string;
  productId: string;
  mediaIndex: number;
  x: number;
  y: number;
}

export type Disclosure = 'none' | 'affiliate' | 'sponsored' | 'gifted';
export type PostStatus = 'published' | 'draft' | 'scheduled' | 'removed';

export interface Post {
  id: string;
  authorId: string;
  type: 'photo' | 'carousel' | 'video';
  media: Media[];
  caption: string;
  hashtags: string[];
  tags: ProductTagPlacement[];
  disclosure: Disclosure;
  category: string | null;
  country: string | null;
  status: PostStatus;
  scheduledAt: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  isSample: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
}

export interface Product {
  id: string;
  brandProfileId: string | null;
  brandName: string;
  title: string;
  variant: string | null;
  description: string;
  category: string;
  images: string[];
  gtin: string | null;
  countries: string[];
  status: 'approved' | 'pending_review' | 'rejected';
  isSample: boolean;
}

export interface Marketplace {
  id: string;
  name: string;
  color: string;
  countries: string[];
  /** sample merchants are fictional and exist only in demo mode */
  isSample: boolean;
}

export interface Offer {
  id: string;
  productId: string;
  marketplaceId: string;
  price: number;
  currency: string;
  shippingCost: number | null;
  availability: 'in_stock' | 'out_of_stock' | 'unknown';
  priceSource: 'merchant_feed' | 'partner_api' | 'manual_estimate';
  lastUpdated: string;
  country: string;
  affiliateEligible: boolean;
  /** Authorized merchant/affiliate URL. null => not configured, purchase CTA disabled. */
  url: string | null;
}

export interface CollectionItem {
  kind: 'post' | 'product';
  refId: string;
  addedAt: string;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  isPrivate: boolean;
  items: CollectionItem[];
  createdAt: string;
}

export type NotificationType = 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'system' | 'price_alert';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  postId: string | null;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  kind: 'personal' | 'collaboration';
  participantIds: string[];
  /** message requests from non-followed accounts land here until accepted */
  status: 'active' | 'request';
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type ReportTarget = 'post' | 'comment' | 'profile' | 'message' | 'product';
export type ReportReason = 'spam' | 'harassment' | 'misleading' | 'undisclosed_ad' | 'ip' | 'counterfeit' | 'nudity' | 'violence' | 'other';

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
  createdAt: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  currency: string;
  createdAt: string;
}

export interface ClickEvent {
  id: string;
  userId: string | null;
  offerId: string;
  postId: string | null;
  creatorId: string | null;
  createdAt: string;
}

export interface Category {
  slug: string;
  icon: string;
}

export type FeedMode = 'for_you' | 'following' | 'trending';

export interface FeedQuery {
  mode: FeedMode;
  category?: string | null;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  type: 'all' | 'creators' | 'products' | 'posts' | 'brands' | 'hashtags';
  category?: string | null;
  country?: string | null;
  verifiedOnly?: boolean;
  sort?: 'relevance' | 'recent' | 'popular';
}

export interface SearchResults {
  creators: Profile[];
  brands: Profile[];
  products: Product[];
  posts: Post[];
  hashtags: { tag: string; count: number }[];
}

export interface NewPostInput {
  type: Post['type'];
  media: Omit<Media, 'id'>[];
  caption: string;
  tags: Omit<ProductTagPlacement, 'id'>[];
  disclosure: Disclosure;
  category: string | null;
  status: 'published' | 'draft' | 'scheduled';
  scheduledAt: string | null;
}

export interface ProfileUpdate {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string | null;
  website?: string | null;
  country?: string;
  locale?: string;
  interests?: string[];
  isCreator?: boolean;
  isPrivate?: boolean;
  onboardingCompleted?: boolean;
}

export interface ProductProposal {
  brandName: string;
  title: string;
  variant: string | null;
  url: string;
  gtin: string | null;
  category: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Phase 4 — monetisation
// ---------------------------------------------------------------------------
export type ConversionStatus = 'reported' | 'confirmed' | 'approved' | 'reversed' | 'rejected';
export type LedgerBucket = 'pending' | 'approved' | 'in_payout' | 'paid' | 'none';

export interface AffiliateLink {
  id: string;
  creatorId: string;
  offerId: string;
  code: string;
  createdAt: string;
  /** false until an authorised affiliate programme is attached to the offer */
  trackingActive: boolean;
}

export interface Conversion {
  id: string;
  networkName: string;
  providerEventId: string;
  creatorId: string | null;
  offerId: string | null;
  productId: string | null;
  orderAmount: number;
  commissionAmount: number;
  currency: string;
  status: ConversionStatus;
  rejectReason: string | null;
  creatorShareBps: number | null;
  /** creator's share of the (non-reversed) commission, null while only reported */
  creatorAmount: number | null;
  reversedAmount: number;
  occurredAt: string;
  confirmedAt: string | null;
  holdUntil: string | null;
  isSample: boolean;
}

export interface CurrencyEarnings {
  currency: string;
  /** reported by the network but NOT confirmed: an estimate, never money */
  estimated: number;
  pending: number;
  approved: number;
  inPayout: number;
  paid: number;
  reversed: number;
  /** approved funds that can be requested (requires a verified payout account) */
  available: number;
}

export interface EarningsSummary {
  byCurrency: CurrencyEarnings[];
  clicks: number;
  reportedConversions: number;
  confirmedConversions: number;
  payoutEligible: boolean;
}

export interface PayoutAccount {
  creatorId: string;
  provider: string;
  status: 'not_started' | 'pending_verification' | 'verified' | 'rejected' | 'disabled';
  kycStatus: 'not_started' | 'pending' | 'verified' | 'failed';
  taxFormStatus: 'not_started' | 'submitted' | 'accepted' | 'rejected';
  payoutCurrency: string | null;
}

export type PayoutStatus = 'requested' | 'approved' | 'rejected' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface Payout {
  id: string;
  creatorId: string;
  currency: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: string;
  events: { status: string; note: string; at: string }[];
}

export interface ClickStat {
  productId: string;
  postId: string | null;
  clicks: number;
  confirmedConversions: number;
  creatorEarned: { currency: string; amount: number }[];
}
