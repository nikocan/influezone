/**
 * Pure commission / ledger engine. Mirrors the SQL functions in
 * supabase/migrations/20261105000005_monetization_ledger.sql so demo mode behaves identically.
 * Rules: amounts are per currency and never summed across currencies; entries are append-only;
 * every transaction balances to zero.
 */
import type { CurrencyEarnings, LedgerBucket } from '@/data/types';

export interface LedgerEntry {
  id: number;
  txnId: string;
  account: string; // 'creator:<id>' | 'platform' | 'network:<id>'
  bucket: LedgerBucket;
  type: 'commission' | 'release' | 'reversal' | 'payout_hold' | 'payout_release' | 'payout_paid' | 'adjustment';
  amount: number;
  currency: string;
  conversionId: string | null;
  payoutId: string | null;
  memo: string;
  createdAt: string;
}

export interface RuleLike {
  id: string;
  creatorShareBps: number;
  holdDays: number;
  creatorId?: string | null;
  networkId?: string | null;
  organizationId?: string | null;
  country?: string | null;
  validFrom: string;
  validTo?: string | null;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Most specific active rule wins: creator > organization > network > country > default. */
export function resolveRule(rules: RuleLike[], ctx: { creatorId: string | null; networkId: string | null; organizationId: string | null; country: string | null; at: string }): RuleLike | null {
  const at = new Date(ctx.at).getTime();
  const ok = rules.filter((r) =>
    new Date(r.validFrom).getTime() <= at && (!r.validTo || new Date(r.validTo).getTime() > at) &&
    (!r.creatorId || r.creatorId === ctx.creatorId) && (!r.networkId || r.networkId === ctx.networkId) &&
    (!r.organizationId || r.organizationId === ctx.organizationId) && (!r.country || r.country === ctx.country));
  const score = (r: RuleLike) => (r.creatorId ? 8 : 0) + (r.organizationId ? 4 : 0) + (r.networkId ? 2 : 0) + (r.country ? 1 : 0);
  return ok.sort((a, b) => score(b) - score(a) || b.validFrom.localeCompare(a.validFrom))[0] ?? null;
}

/** Creator payable = confirmed merchant commission × creator share (platform keeps the rest). */
export function splitCommission(commission: number, creatorShareBps: number) {
  // integer cents so results match PostgreSQL numeric round() (half away from zero) exactly
  const cents = Math.round(commission * 100);
  const creatorCents = Math.sign(cents) * Math.round((Math.abs(cents) * creatorShareBps) / 10000);
  return { creator: creatorCents / 100, platform: (cents - creatorCents) / 100 };
}

export function isBalanced(entries: Pick<LedgerEntry, 'txnId' | 'amount'>[]): boolean {
  const sums = new Map<string, number>();
  for (const e of entries) sums.set(e.txnId, round2((sums.get(e.txnId) ?? 0) + e.amount));
  return [...sums.values()].every((v) => v === 0);
}

export function bucketBalance(entries: LedgerEntry[], account: string, currency: string, bucket: LedgerBucket) {
  return round2(entries.filter((e) => e.account === account && e.currency === currency && e.bucket === bucket).reduce((s, e) => s + e.amount, 0));
}

/** Per-currency summary for one creator. `estimated` comes from reported-but-unconfirmed conversions. */
export function summarize(entries: LedgerEntry[], creatorId: string, estimates: { currency: string; amount: number }[], payoutEligible: boolean): CurrencyEarnings[] {
  const acc = `creator:${creatorId}`;
  const currencies = new Set([...entries.filter((e) => e.account === acc).map((e) => e.currency), ...estimates.map((e) => e.currency)]);
  return [...currencies].sort().map((currency) => {
    const reversed = -round2(entries.filter((e) => e.account === acc && e.currency === currency && e.type === 'reversal').reduce((s, e) => s + e.amount, 0));
    const approved = bucketBalance(entries, acc, currency, 'approved');
    return {
      currency,
      estimated: round2(estimates.filter((e) => e.currency === currency).reduce((s, e) => s + e.amount, 0)),
      pending: bucketBalance(entries, acc, currency, 'pending'),
      approved,
      inPayout: bucketBalance(entries, acc, currency, 'in_payout'),
      paid: bucketBalance(entries, acc, currency, 'paid'),
      reversed,
      available: payoutEligible ? Math.max(0, approved) : 0,
    };
  });
}

export function withinWindow(clickAt: string, occurredAt: string, windowDays: number) {
  const c = new Date(clickAt).getTime();
  const o = new Date(occurredAt).getTime();
  return c <= o && o - c <= windowDays * 864e5;
}
