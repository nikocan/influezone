/** SAMPLE brand organisations and campaigns (demo mode only; fictional, labelled "Sample"). */
import type { Campaign, Organization } from '../types';

export function seedOrganizations(): Organization[] {
  const o = (id: string, name: string, slug: string, brandProfileId: string, country: string, verified: boolean): Organization => ({
    id, name, slug, website: `https://example.com/${slug}`, country, verificationStatus: verified ? 'verified' : 'unverified', brandProfileId, createdAt: '2026-01-05T10:00:00.000Z', isSample: true,
  });
  return [
    o('org_lumora', 'Lumora Beauty', 'lumora', 'b_lumora', 'TR', true),
    o('org_kuzey', 'Kuzey Outdoor', 'kuzey', 'b_kuzey', 'TR', false),
    o('org_aurelia', 'Aurelia Watches', 'aurelia', 'b_aurelia', 'TR', true),
    o('org_pixelon', 'Pixelon Audio', 'pixelon', 'b_pixelon', 'TR', false),
  ];
}

export function seedCampaigns(now: number): Campaign[] {
  const day = 864e5;
  const iso = (d: number) => new Date(now + d * day).toISOString();
  const base = { brief: '', countries: ['TR'], categories: [] as string[], productIds: [] as string[], rejectionNote: null, createdAt: iso(-10), isSample: true, budget: null, fixedFee: null, commissionBps: null };
  return [
    { ...base, id: 'cmp_lumora_serum', organizationId: 'org_lumora', brandProfileId: 'b_lumora', title: 'Lumora Daily Serum — 4 haftalık deneyim', objective: 'awareness', type: 'fixed_fee', currency: 'TRY', budget: 60000, fixedFee: 7500,
      brief: 'Serumu 4 hafta kullanıp dürüst deneyimini paylaş. Önce/sonra iddiası, tıbbi iddia yasak. Hassas cilt notu ekle.', categories: ['beauty'], minFollowers: 1000, deliverables: [{ kind: 'video', count: 1 }, { kind: 'post', count: 1 }],
      requiredDisclosure: 'sponsored', productIds: ['pr_serum'], applicationDeadline: iso(14), startsAt: iso(16), endsAt: iso(46), status: 'open' },
    { ...base, id: 'cmp_aurelia_affiliate', organizationId: 'org_aurelia', brandProfileId: 'b_aurelia', title: 'Aurelia Classic 38 — affiliate programı', objective: 'sales', type: 'affiliate', currency: 'TRY', commissionBps: 800,
      brief: 'Saatini günlük kombinlerinde kullan; ürünü etiketle. Komisyon yalnızca onaylı satışlar üzerinden.', categories: ['accessories', 'fashion'], minFollowers: 0, deliverables: [{ kind: 'carousel', count: 1 }],
      requiredDisclosure: 'affiliate', productIds: ['pr_watch'], applicationDeadline: iso(30), startsAt: iso(1), endsAt: iso(90), status: 'open' },
    { ...base, id: 'cmp_kuzey_outdoor', organizationId: 'org_kuzey', brandProfileId: 'b_kuzey', title: 'Kuzey Shell Jacket — yağmurda test', objective: 'launch', type: 'hybrid', currency: 'TRY', fixedFee: 4000, commissionBps: 500, budget: 40000,
      brief: 'Montu gerçek outdoor koşullarında dene. Su geçirmezlik testini videoda göster.', categories: ['fitness', 'travel'], minFollowers: 10000, deliverables: [{ kind: 'video', count: 2 }],
      requiredDisclosure: 'gifted', productIds: ['pr_jacket'], applicationDeadline: iso(7), startsAt: iso(10), endsAt: iso(40), status: 'open' },
  ];
}
