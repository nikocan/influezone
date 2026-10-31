import { bestPriceOfferId, priceFreshness, sortOffers, offersForCountry } from './commerce';
import type { Offer } from '@/data/types';

const now = new Date('2026-10-31T12:00:00Z');
const h = (n: number) => new Date(now.getTime() - n * 36e5).toISOString();
const offer = (p: Partial<Offer>): Offer => ({
  id: 'o', productId: 'p', marketplaceId: 'm', price: 100, currency: 'TRY', shippingCost: 0, availability: 'in_stock',
  priceSource: 'merchant_feed', lastUpdated: h(1), country: 'TR', affiliateEligible: true, url: null, ...p,
});

describe('best price labelling', () => {
  it('labels the lowest total when data is fair and fresh', () => {
    const offers = [offer({ id: 'a', price: 100, shippingCost: 10 }), offer({ id: 'b', price: 105, shippingCost: 0 })];
    expect(bestPriceOfferId(offers, now)).toBe('b');
  });
  it('never labels with a single offer', () => {
    expect(bestPriceOfferId([offer({ id: 'a' })], now)).toBeNull();
  });
  it('refuses when any compared offer is stale', () => {
    expect(bestPriceOfferId([offer({ id: 'a', price: 90, lastUpdated: h(30) }), offer({ id: 'b' })], now)).toBeNull();
  });
  it('refuses when shipping is unknown', () => {
    expect(bestPriceOfferId([offer({ id: 'a', shippingCost: null }), offer({ id: 'b', price: 120 })], now)).toBeNull();
  });
  it('refuses when an offer is an estimate', () => {
    expect(bestPriceOfferId([offer({ id: 'a', priceSource: 'manual_estimate' }), offer({ id: 'b', price: 120 })], now)).toBeNull();
  });
  it('refuses to compare different currencies', () => {
    expect(bestPriceOfferId([offer({ id: 'a', currency: 'USD' }), offer({ id: 'b', price: 120 })], now)).toBeNull();
  });
  it('ignores out-of-stock offers', () => {
    const offers = [offer({ id: 'a', price: 10, availability: 'out_of_stock' }), offer({ id: 'b', price: 100 }), offer({ id: 'c', price: 110 })];
    expect(bestPriceOfferId(offers, now)).toBe('b');
  });
  it('does not pick a winner on ties', () => {
    expect(bestPriceOfferId([offer({ id: 'a' }), offer({ id: 'b' })], now)).toBeNull();
  });
});

describe('freshness & sorting', () => {
  it('classifies freshness', () => {
    expect(priceFreshness({ lastUpdated: h(2) }, now)).toBe('fresh');
    expect(priceFreshness({ lastUpdated: h(48) }, now)).toBe('aging');
    expect(priceFreshness({ lastUpdated: h(100) }, now)).toBe('stale');
  });
  it('sorts out-of-stock last', () => {
    const s = sortOffers([offer({ id: 'x', price: 1, availability: 'out_of_stock' }), offer({ id: 'y', price: 5 })], 'price');
    expect(s.map((o) => o.id)).toEqual(['y', 'x']);
  });
  it('filters by country without converting currencies', () => {
    const list = offersForCountry([offer({ id: 'tr' }), offer({ id: 'us', country: 'US', currency: 'USD' })], 'US');
    expect(list.map((o) => o.currency)).toEqual(['USD']);
  });
});
