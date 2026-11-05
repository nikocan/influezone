import type {
  AppNotification,
  ClickEvent,
  Collection,
  Comment,
  Conversation,
  Marketplace,
  Message,
  ModerationReport,
  Offer,
  Post,
  PriceAlert,
  Product,
  Profile,
} from '../types';
import type { AffiliateLink, PayoutAccount, Payout, ConversionStatus } from '../types';
import type { LedgerEntry, RuleLike } from '@/lib/ledger';
import { seedComments, seedMarketplaces, seedOffers, seedPosts, seedProducts, seedProfiles, SAMPLE_FOLLOWS } from './seed';

export interface DemoAccount {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
  roles: ('shopper' | 'creator' | 'brand' | 'admin' | 'moderator')[];
}

export interface DemoConversation extends Omit<Conversation, 'unreadCount'> {
  lastReadAt: Record<string, string>;
  initiatorId: string;
}

export interface DemoConversion {
  id: string;
  networkId: string;
  networkName: string;
  providerEventId: string;
  linkId: string | null;
  clickId: string | null;
  creatorId: string | null;
  offerId: string | null;
  country: string | null;
  orderAmount: number;
  commissionAmount: number;
  currency: string;
  status: ConversionStatus;
  rejectReason: string | null;
  isSelfPurchase: boolean;
  ruleId: string | null;
  creatorShareBps: number | null;
  occurredAt: string;
  confirmedAt: string | null;
  holdUntil: string | null;
  reversedAmount: number;
  isSample: boolean;
}

export interface DemoDB {
  version: number;
  accounts: DemoAccount[];
  profiles: Profile[];
  posts: Post[];
  comments: Comment[];
  follows: { followerId: string; followeeId: string; createdAt: string }[];
  likes: { userId: string; postId: string; createdAt: string }[];
  collections: Collection[];
  notifications: AppNotification[];
  conversations: DemoConversation[];
  messages: Message[];
  blocks: { blockerId: string; blockedId: string }[];
  mutes: { muterId: string; mutedId: string }[];
  reports: ModerationReport[];
  priceAlerts: PriceAlert[];
  clicks: ClickEvent[];
  products: Product[];
  /** catalog snapshot — regenerated on every load so freshness is relative to "now" */
  offers: Offer[];
  marketplaces: Marketplace[];
  // Phase 4
  affiliateLinks: AffiliateLink[];
  conversions: DemoConversion[];
  ledger: LedgerEntry[];
  rules: RuleLike[];
  payoutAccounts: PayoutAccount[];
  payouts: Payout[];
}

const DEFAULT_RULES: RuleLike[] = [{ id: 'rule_default', creatorShareBps: 7000, holdDays: 30, validFrom: '2020-01-01T00:00:00.000Z' }];

function addPhase4(d: Partial<DemoDB>) {
  d.affiliateLinks ??= [];
  d.conversions ??= [];
  d.ledger ??= [];
  d.rules ??= DEFAULT_RULES;
  d.payoutAccounts ??= [];
  d.payouts ??= [];
}

const KEY = 'sf.demo.db';
const VERSION = 4;

function fresh(): DemoDB {
  const now = Date.now();
  return {
    version: VERSION,
    accounts: [],
    profiles: seedProfiles(),
    posts: seedPosts(now),
    comments: seedComments(now),
    follows: SAMPLE_FOLLOWS.map(([a, b]) => ({ followerId: a, followeeId: b, createdAt: new Date(now).toISOString() })),
    likes: [],
    collections: [],
    notifications: [],
    conversations: [],
    messages: [],
    blocks: [],
    mutes: [],
    reports: [],
    priceAlerts: [],
    clicks: [],
    products: seedProducts(),
    offers: seedOffers(now),
    marketplaces: seedMarketplaces(),
    affiliateLinks: [],
    conversions: [],
    ledger: [],
    rules: DEFAULT_RULES,
    payoutAccounts: [],
    payouts: [],
  };
}

let db: DemoDB | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function getDB(): DemoDB {
  if (db) return db;
  const raw = storage()?.getItem(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDB;
      if (parsed.version === 3) {
        // forward migration: keep the user's demo accounts and posts
        addPhase4(parsed);
        parsed.version = VERSION;
      }
      if (parsed.version === VERSION) {
        parsed.offers = seedOffers(Date.now());
        parsed.marketplaces = seedMarketplaces();
        db = parsed;
        return db;
      }
    } catch {
      /* corrupted → reset */
    }
  }
  db = fresh();
  persist();
  return db;
}

export function persist() {
  if (!db) return;
  try {
    const { offers: _o, marketplaces: _m, ...rest } = db;
    storage()?.setItem(KEY, JSON.stringify({ ...rest, offers: [], marketplaces: [] }));
  } catch {
    /* quota exceeded (e.g. large uploaded media) — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function mutate<T>(fn: (d: DemoDB) => T): T {
  const d = getDB();
  const r = fn(d);
  persist();
  return r;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Wipes all locally stored demo data (accounts, posts, likes …) and reseeds samples. */
export function resetDemo() {
  db = fresh();
  persist();
}

/** test helper */
export function __setDB(next: DemoDB | null) {
  db = next;
}
export const __fresh = fresh;
