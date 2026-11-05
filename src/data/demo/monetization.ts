/**
 * Demo-mode monetisation engine. Mirrors the SQL lifecycle (ingest → confirm → release → reverse,
 * payout request/hold) on top of the shared pure ledger helpers. All conversions created here come
 * from an explicitly labelled SAMPLE network report — never from clicks.
 */
import type { DemoConversion, DemoDB } from './store';
import type { ClickStat, Conversion, EarningsSummary, Payout, PayoutAccount } from '../types';
import { resolveRule, splitCommission, summarize, withinWindow, round2, type LedgerEntry } from '@/lib/ledger';
import { AppError } from '../errors';
import { uid } from '@/lib/utils';

export const SAMPLE_NETWORK = { id: 'net_sample', name: 'Sample Network (demo)', windowDays: 7 };

function post(d: DemoDB, txnId: string, account: string, bucket: LedgerEntry['bucket'], type: LedgerEntry['type'], amount: number, currency: string, conversionId: string | null, payoutId: string | null, memo: string, at = new Date().toISOString()) {
  if (amount === 0) return;
  const id = (d.ledger[d.ledger.length - 1]?.id ?? 0) + 1;
  d.ledger.push({ id, txnId, account, bucket, type, amount: round2(amount), currency, conversionId, payoutId, memo, createdAt: at });
}

function productOfOffer(d: DemoDB, offerId: string | null) {
  return d.offers.find((o) => o.id === offerId)?.productId ?? null;
}

export function confirmConversion(d: DemoDB, c: DemoConversion, at = new Date()) {
  if (c.status !== 'reported') return;
  const rule = resolveRule(d.rules, { creatorId: c.creatorId, networkId: c.networkId, organizationId: null, country: c.country, at: c.occurredAt });
  if (!rule) throw new AppError('not_configured');
  const { creator, platform } = splitCommission(c.commissionAmount, rule.creatorShareBps);
  c.status = 'confirmed';
  c.confirmedAt = at.toISOString();
  c.ruleId = rule.id;
  c.creatorShareBps = rule.creatorShareBps;
  c.holdUntil = new Date(at.getTime() + rule.holdDays * 864e5).toISOString();
  const txn = uid('txn');
  post(d, txn, `network:${c.networkId}`, 'none', 'commission', -c.commissionAmount, c.currency, c.id, null, 'merchant commission confirmed', c.confirmedAt);
  post(d, txn, `creator:${c.creatorId}`, 'pending', 'commission', creator, c.currency, c.id, null, 'creator share', c.confirmedAt);
  post(d, txn, 'platform', 'none', 'commission', platform, c.currency, c.id, null, 'platform share', c.confirmedAt);
}

export function releaseConversion(d: DemoDB, c: DemoConversion, now = new Date()) {
  if (c.status !== 'confirmed' || !c.holdUntil || new Date(c.holdUntil) > now) return false;
  const acc = `creator:${c.creatorId}`;
  const pend = round2(d.ledger.filter((e) => e.conversionId === c.id && e.account === acc && e.bucket === 'pending').reduce((s, e) => s + e.amount, 0));
  const txn = uid('txn');
  post(d, txn, acc, 'pending', 'release', -pend, c.currency, c.id, null, 'hold released');
  post(d, txn, acc, 'approved', 'release', pend, c.currency, c.id, null, 'hold released');
  c.status = 'approved';
  return true;
}

export function reverseConversion(d: DemoDB, c: DemoConversion, commissionReversed: number, reason: string) {
  if (c.status === 'rejected') return;
  const amt = round2(Math.min(commissionReversed, c.commissionAmount - c.reversedAmount));
  if (amt <= 0) return;
  if (c.status === 'reported') {
    c.reversedAmount = round2(c.reversedAmount + amt);
    c.status = 'reversed';
    c.rejectReason = reason;
    return;
  }
  const { creator, platform } = splitCommission(amt, c.creatorShareBps ?? 0);
  const bucket = c.status === 'confirmed' ? 'pending' : 'approved';
  const txn = uid('txn');
  post(d, txn, `network:${c.networkId}`, 'none', 'reversal', amt, c.currency, c.id, null, reason);
  post(d, txn, `creator:${c.creatorId}`, bucket, 'reversal', -creator, c.currency, c.id, null, reason);
  post(d, txn, 'platform', 'none', 'reversal', -platform, c.currency, c.id, null, reason);
  c.reversedAmount = round2(c.reversedAmount + amt);
  if (c.reversedAmount >= c.commissionAmount) c.status = 'reversed';
}

export interface ReportRow {
  providerEventId: string;
  linkCode: string;
  orderAmount: number;
  commission: number;
  currency: string;
  occurredAt: string;
  status: 'reported' | 'confirmed' | 'reversed';
  refund?: number;
}

/** Idempotent ingestion keyed by (network, providerEventId). */
export function ingest(d: DemoDB, row: ReportRow, now = new Date()): 'imported' | 'duplicate' | 'updated' | 'rejected' {
  const existing = d.conversions.find((c) => c.networkId === SAMPLE_NETWORK.id && c.providerEventId === row.providerEventId);
  if (existing) {
    if (row.status === 'confirmed' && existing.status === 'reported') { confirmConversion(d, existing, now); return 'updated'; }
    if (row.status === 'reversed' && existing.status !== 'reversed' && existing.status !== 'rejected') { reverseConversion(d, existing, existing.commissionAmount - existing.reversedAmount, 'provider_reversal'); return 'updated'; }
    return 'duplicate';
  }
  const link = d.affiliateLinks.find((l) => l.code === row.linkCode) ?? null;
  const click = link ? [...d.clicks].filter((c) => c.offerId === link.offerId && c.creatorId === link.creatorId && c.createdAt <= row.occurredAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined;
  const selfClick = link ? [...d.clicks].filter((c) => c.offerId === link.offerId && c.userId === link.creatorId && c.createdAt <= row.occurredAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined;
  const lastClick = [click, selfClick].filter(Boolean).sort((a, b) => b!.createdAt.localeCompare(a!.createdAt))[0];
  const conv: DemoConversion = {
    id: uid('cv'), networkId: SAMPLE_NETWORK.id, networkName: SAMPLE_NETWORK.name, providerEventId: row.providerEventId, linkId: link?.id ?? null,
    clickId: lastClick?.id ?? null, creatorId: link?.creatorId ?? null, offerId: link?.offerId ?? null, country: null,
    orderAmount: row.orderAmount, commissionAmount: row.commission, currency: row.currency, status: 'reported', rejectReason: null,
    isSelfPurchase: !!lastClick && lastClick === selfClick, ruleId: null, creatorShareBps: null, occurredAt: row.occurredAt, confirmedAt: null, holdUntil: null, reversedAmount: 0, isSample: true,
  };
  d.conversions.push(conv);
  if (!link || !lastClick || !withinWindow(lastClick.createdAt, row.occurredAt, SAMPLE_NETWORK.windowDays)) {
    conv.status = 'rejected';
    conv.rejectReason = 'no_attributable_click';
    return 'rejected';
  }
  if (conv.isSelfPurchase) {
    conv.status = 'rejected';
    conv.rejectReason = 'self_purchase';
    return 'rejected';
  }
  if (row.status !== 'reported') confirmConversion(d, conv, new Date(row.occurredAt));
  if (row.refund) reverseConversion(d, conv, row.refund, 'customer_refund');
  if (row.status === 'reversed') reverseConversion(d, conv, conv.commissionAmount - conv.reversedAmount, 'order_cancelled');
  return 'imported';
}

/** Releases every conversion whose hold window has ended. */
export function releaseDue(d: DemoDB, now = new Date()) {
  let n = 0;
  for (const c of d.conversions) if (releaseConversion(d, c, now)) n++;
  return n;
}

const DAY = 864e5;

/**
 * Builds a SAMPLE network report for this creator covering the main lifecycle cases. Provider event ids are
 * deterministic so importing twice demonstrates de-duplication.
 */
export function sampleReport(d: DemoDB, creatorId: string, now = Date.now()): ReportRow[] {
  const ensureLink = (offerId: string) => {
    let l = d.affiliateLinks.find((x) => x.creatorId === creatorId && x.offerId === offerId);
    if (!l) {
      l = { id: uid('al'), creatorId, offerId, code: `SF${Math.random().toString(36).slice(2, 8).toUpperCase()}`, createdAt: new Date(now - 60 * DAY).toISOString(), trackingActive: false };
      d.affiliateLinks.push(l);
    }
    return l;
  };
  const click = (offerId: string, daysAgo: number, userId: string | null = 'p_noah') => {
    const at = new Date(now - daysAgo * DAY).toISOString();
    if (!d.clicks.some((c) => c.offerId === offerId && c.createdAt === at)) d.clicks.push({ id: uid('clk'), userId, offerId, postId: null, creatorId: userId === creatorId ? null : creatorId, createdAt: at });
  };
  const tr = ensureLink('of_w1');
  const tr2 = ensureLink('of_se1');
  const us = ensureLink('of_w4');
  click('of_w1', 45); click('of_w1', 20); click('of_w1', 3); click('of_w1', 1);
  click('of_se1', 6); click('of_se1', 2);
  click('of_w4', 50);
  click('of_se1', 0.5, creatorId); // creator clicked own link
  const at = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
  const ev = (n: number) => `SAMPLE-${creatorId.slice(-6)}-${n}`;
  return [
    { providerEventId: ev(1), linkCode: tr.code, orderAmount: 7499, commission: 374.95, currency: 'TRY', occurredAt: at(44), status: 'confirmed' },                 // released → approved
    { providerEventId: ev(2), linkCode: tr.code, orderAmount: 7299, commission: 364.95, currency: 'TRY', occurredAt: at(19), status: 'confirmed' },                 // pending (hold)
    { providerEventId: ev(3), linkCode: tr.code, orderAmount: 7499, commission: 374.95, currency: 'TRY', occurredAt: at(2.5), status: 'reported' },                 // estimated only
    { providerEventId: ev(4), linkCode: tr2.code, orderAmount: 1298, commission: 129.8, currency: 'TRY', occurredAt: at(5), status: 'confirmed', refund: 64.9 },    // partial refund
    { providerEventId: ev(5), linkCode: tr2.code, orderAmount: 649, commission: 64.9, currency: 'TRY', occurredAt: at(0.4), status: 'confirmed' },                  // self purchase → rejected
    { providerEventId: ev(6), linkCode: tr.code, orderAmount: 7299, commission: 364.95, currency: 'TRY', occurredAt: at(30), status: 'confirmed' },                 // outside 7-day window → rejected
    { providerEventId: ev(7), linkCode: us.code, orderAmount: 189, commission: 9.45, currency: 'USD', occurredAt: at(49), status: 'confirmed' },                    // other currency, released
  ];
}

export function toConversion(d: DemoDB, c: DemoConversion): Conversion {
  const creatorAmount = c.creatorShareBps === null ? null : splitCommission(c.commissionAmount - c.reversedAmount, c.creatorShareBps).creator;
  return {
    id: c.id, networkName: c.networkName, providerEventId: c.providerEventId, creatorId: c.creatorId, offerId: c.offerId, productId: productOfOffer(d, c.offerId),
    orderAmount: c.orderAmount, commissionAmount: c.commissionAmount, currency: c.currency, status: c.status, rejectReason: c.rejectReason,
    creatorShareBps: c.creatorShareBps, creatorAmount, reversedAmount: c.reversedAmount, occurredAt: c.occurredAt, confirmedAt: c.confirmedAt, holdUntil: c.holdUntil, isSample: c.isSample,
  };
}

export function payoutAccountOf(d: DemoDB, creatorId: string): PayoutAccount {
  return d.payoutAccounts.find((a) => a.creatorId === creatorId) ?? { creatorId, provider: 'unconfigured', status: 'not_started', kycStatus: 'not_started', taxFormStatus: 'not_started', payoutCurrency: null };
}

export function isPayoutEligible(a: PayoutAccount) {
  return a.status === 'verified' && a.kycStatus === 'verified' && a.taxFormStatus === 'accepted';
}

export function earningsSummary(d: DemoDB, creatorId: string): EarningsSummary {
  const mine = d.conversions.filter((c) => c.creatorId === creatorId);
  const estimates = mine.filter((c) => c.status === 'reported').map((c) => ({ currency: c.currency, amount: splitCommission(c.commissionAmount, resolveRule(d.rules, { creatorId, networkId: c.networkId, organizationId: null, country: null, at: c.occurredAt })?.creatorShareBps ?? 0).creator }));
  const eligible = isPayoutEligible(payoutAccountOf(d, creatorId));
  return {
    byCurrency: summarize(d.ledger, creatorId, estimates, eligible),
    clicks: d.clicks.filter((c) => c.creatorId === creatorId).length,
    reportedConversions: mine.filter((c) => c.status === 'reported').length,
    confirmedConversions: mine.filter((c) => c.status === 'confirmed' || c.status === 'approved').length,
    payoutEligible: eligible,
  };
}

export function clickStats(d: DemoDB, creatorId: string): ClickStat[] {
  const map = new Map<string, ClickStat>();
  const key = (productId: string, postId: string | null) => `${productId}|${postId ?? ''}`;
  for (const c of d.clicks.filter((x) => x.creatorId === creatorId)) {
    const productId = productOfOffer(d, c.offerId);
    if (!productId) continue;
    const k = key(productId, null);
    const s = map.get(k) ?? { productId, postId: null, clicks: 0, confirmedConversions: 0, creatorEarned: [] };
    s.clicks++;
    map.set(k, s);
  }
  for (const c of d.conversions.filter((x) => x.creatorId === creatorId && (x.status === 'confirmed' || x.status === 'approved'))) {
    const productId = productOfOffer(d, c.offerId);
    if (!productId) continue;
    const k = key(productId, null);
    const s = map.get(k) ?? { productId, postId: null, clicks: 0, confirmedConversions: 0, creatorEarned: [] };
    s.confirmedConversions++;
    const amt = splitCommission(c.commissionAmount - c.reversedAmount, c.creatorShareBps ?? 0).creator;
    const cur = s.creatorEarned.find((e) => e.currency === c.currency);
    if (cur) cur.amount = round2(cur.amount + amt);
    else s.creatorEarned.push({ currency: c.currency, amount: amt });
    map.set(k, s);
  }
  return [...map.values()].sort((a, b) => b.clicks - a.clicks);
}

export function requestPayout(d: DemoDB, creatorId: string, currency: string, amount: number): Payout {
  if (!isPayoutEligible(payoutAccountOf(d, creatorId))) throw new AppError('payout_not_eligible');
  if (d.payouts.some((p) => p.creatorId === creatorId && p.currency === currency && ['requested', 'approved', 'processing'].includes(p.status))) throw new AppError('payout_open');
  const avail = round2(d.ledger.filter((e) => e.account === `creator:${creatorId}` && e.currency === currency && e.bucket === 'approved').reduce((s, e) => s + e.amount, 0));
  if (!(amount > 0) || amount > avail) throw new AppError('insufficient_funds');
  const p: Payout = { id: uid('po'), creatorId, currency, amount: round2(amount), status: 'requested', requestedAt: new Date().toISOString(), events: [{ status: 'requested', note: '', at: new Date().toISOString() }] };
  const txn = uid('txn');
  post(d, txn, `creator:${creatorId}`, 'approved', 'payout_hold', -p.amount, currency, null, p.id, 'payout requested');
  post(d, txn, `creator:${creatorId}`, 'in_payout', 'payout_hold', p.amount, currency, null, p.id, 'payout requested');
  d.payouts.push(p);
  return p;
}
