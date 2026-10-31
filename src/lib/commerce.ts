import type { Offer } from '@/data/types';

export const FRESH_HOURS = 24;
export const STALE_HOURS = 72;

export type PriceFreshness = 'fresh' | 'aging' | 'stale';

export function priceFreshness(offer: Pick<Offer, 'lastUpdated'>, now: Date = new Date()): PriceFreshness {
  const hours = (now.getTime() - new Date(offer.lastUpdated).getTime()) / 36e5;
  if (hours <= FRESH_HOURS) return 'fresh';
  if (hours <= STALE_HOURS) return 'aging';
  return 'stale';
}

export function isEstimated(offer: Pick<Offer, 'priceSource'>) {
  return offer.priceSource === 'manual_estimate';
}

export function offerTotal(offer: Offer): number | null {
  if (offer.shippingCost === null) return null;
  return offer.price + offer.shippingCost;
}

/**
 * Returns the id of the offer that may be labelled "Best price", or null.
 * A label is only allowed when the comparison is fair:
 *  - at least two offers in the same currency and country,
 *  - every compared offer is in stock, fresh (<24h), from a verified feed/API (not an estimate),
 *  - shipping cost is known for every compared offer.
 */
export function bestPriceOfferId(offers: Offer[], now: Date = new Date()): string | null {
  const candidates = offers.filter((o) => o.availability === 'in_stock');
  if (candidates.length < 2) return null;
  const currency = candidates[0]!.currency;
  const country = candidates[0]!.country;
  for (const o of candidates) {
    if (o.currency !== currency || o.country !== country) return null;
    if (isEstimated(o) || priceFreshness(o, now) !== 'fresh' || o.shippingCost === null) return null;
  }
  const sorted = [...candidates].sort((a, b) => offerTotal(a)! - offerTotal(b)!);
  if (offerTotal(sorted[0]!) === offerTotal(sorted[1]!)) return null; // tie → no single "best"
  return sorted[0]!.id;
}

export type OfferSort = 'price' | 'updated';

export function sortOffers(offers: Offer[], by: OfferSort): Offer[] {
  const avail = (o: Offer) => (o.availability === 'out_of_stock' ? 1 : 0);
  return [...offers].sort((a, b) => {
    if (avail(a) !== avail(b)) return avail(a) - avail(b);
    if (by === 'updated') return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    return a.price - b.price;
  });
}

/** Offers visible to a shopper in a given country. Different currencies are never merged. */
export function offersForCountry(offers: Offer[], country: string): Offer[] {
  return offers.filter((o) => o.country === country);
}
