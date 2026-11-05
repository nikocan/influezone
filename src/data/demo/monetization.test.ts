import { DemoRepository } from './DemoRepository';
import { __fresh, __setDB, getDB, mutate } from './store';
import { isBalanced, resolveRule, splitCommission } from '@/lib/ledger';
import * as M from './monetization';
import type { AppError } from '../errors';

let viewer: string | null = 'p_elif'; // sample creator
const repo = new DemoRepository(() => viewer, 0);
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return (e as AppError).code; } };

beforeEach(() => { localStorage.clear(); __setDB(__fresh()); viewer = 'p_elif'; });

describe('commission engine', () => {
  it('splits commission and rounds to cents', () => {
    expect(splitCommission(100, 7000)).toEqual({ creator: 70, platform: 30 });
    expect(splitCommission(374.95, 7000)).toEqual({ creator: 262.47, platform: 112.48 });
  });
  it('picks the most specific active rule', () => {
    const rules = [
      { id: 'd', creatorShareBps: 7000, holdDays: 30, validFrom: '2020-01-01' },
      { id: 'c', creatorShareBps: 8000, holdDays: 0, creatorId: 'x', validFrom: '2026-01-01' },
      { id: 'old', creatorShareBps: 9000, holdDays: 0, creatorId: 'x', validFrom: '2020-01-01', validTo: '2021-01-01' },
    ];
    expect(resolveRule(rules, { creatorId: 'x', networkId: null, organizationId: null, country: null, at: '2026-06-01' })!.id).toBe('c');
    expect(resolveRule(rules, { creatorId: 'y', networkId: null, organizationId: null, country: null, at: '2026-06-01' })!.id).toBe('d');
    expect(resolveRule(rules, { creatorId: 'x', networkId: null, organizationId: null, country: null, at: '2020-06-01' })!.id).toBe('old');
  });
});

describe('sample network report (demo lifecycle)', () => {
  it('requires creator mode', async () => {
    viewer = 'p_noah';
    mutate((d) => { d.profiles.find((p) => p.id === 'p_noah')!.isCreator = false; });
    expect(await code(repo.importSampleConversionReport())).toBe('forbidden');
  });

  it('imports once, de-duplicates on re-import and keeps the ledger balanced', async () => {
    const first = await repo.importSampleConversionReport();
    expect(first).toMatchObject({ imported: 5, rejected: 2, duplicates: 0 });
    const second = await repo.importSampleConversionReport();
    expect(second).toMatchObject({ imported: 0, rejected: 0, duplicates: 7 });
    expect(getDB().conversions).toHaveLength(7);
    expect(isBalanced(getDB().ledger)).toBe(true);
  });

  it('rejects self purchases and clicks outside the attribution window', async () => {
    await repo.importSampleConversionReport();
    const rejected = await repo.listConversions('rejected');
    expect(rejected.map((c) => c.rejectReason).sort()).toEqual(['no_attributable_click', 'self_purchase']);
    expect(getDB().ledger.filter((e) => rejected.some((r) => r.id === e.conversionId))).toHaveLength(0);
  });

  it('summarises per currency without mixing currencies', async () => {
    await repo.importSampleConversionReport();
    const s = await repo.getEarningsSummary();
    expect(s.byCurrency.map((c) => c.currency)).toEqual(['TRY', 'USD']);
    const tr = s.byCurrency.find((c) => c.currency === 'TRY')!;
    // EV1 released: 374.95*70% = 262.47 approved
    expect(tr.approved).toBe(262.47);
    // EV2 pending 255.47 + EV4 (129.8 - refund 64.9)*70% = 45.43 pending
    expect(tr.pending).toBe(255.47 + 45.43);
    expect(tr.reversed).toBe(45.43);
    // EV3 reported only → estimate, not in ledger
    expect(tr.estimated).toBe(262.47);
    expect(tr.available).toBe(0); // payout account not verified
    expect(s.byCurrency.find((c) => c.currency === 'USD')!.approved).toBe(6.62);
    expect(s.reportedConversions).toBe(1);
  });

  it('a click alone never produces money', async () => {
    viewer = 'p_noah';
    await repo.recordOutboundClick('of_w1', 'po_1', 'p_elif');
    viewer = 'p_elif';
    const s = await repo.getEarningsSummary();
    expect(s.byCurrency).toHaveLength(0);
    expect(s.clicks).toBe(1);
  });

  it('later full reversal from the network claws back from the right bucket', async () => {
    await repo.importSampleConversionReport();
    const d = getDB();
    const approvedConv = d.conversions.find((c) => c.status === 'approved' && c.currency === 'TRY')!;
    mutate((db) => M.ingest(db, { providerEventId: approvedConv.providerEventId, linkCode: '', orderAmount: 0, commission: 0, currency: 'TRY', occurredAt: approvedConv.occurredAt, status: 'reversed' }));
    const tr = (await repo.getEarningsSummary()).byCurrency.find((c) => c.currency === 'TRY')!;
    expect(tr.approved).toBe(0);
    expect(isBalanced(getDB().ledger)).toBe(true);
  });

  it('payouts require a verified account and cannot exceed approved funds; funds are held', async () => {
    await repo.importSampleConversionReport();
    expect(await code(repo.requestPayout('TRY', 10))).toBe('payout_not_eligible');
    mutate((d) => d.payoutAccounts.push({ creatorId: 'p_elif', provider: 'sandbox', status: 'verified', kycStatus: 'verified', taxFormStatus: 'accepted', payoutCurrency: 'TRY' }));
    expect(await code(repo.requestPayout('TRY', 10000))).toBe('insufficient_funds');
    const p = await repo.requestPayout('TRY', 200);
    expect(p.status).toBe('requested');
    expect(await code(repo.requestPayout('TRY', 10))).toBe('payout_open');
    const tr = (await repo.getEarningsSummary()).byCurrency.find((c) => c.currency === 'TRY')!;
    expect(tr.inPayout).toBe(200);
    expect(tr.approved).toBe(62.47);
    expect(isBalanced(getDB().ledger)).toBe(true);
  });

  it('ledger is append-only from the API surface (no update/delete methods)', () => {
    const methods = Object.getOwnPropertyNames(DemoRepository.prototype);
    expect(methods.some((m) => /ledger|editEarning|deleteConversion/i.test(m))).toBe(false);
  });
});
