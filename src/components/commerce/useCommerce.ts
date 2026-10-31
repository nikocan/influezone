import { useQuery } from '@tanstack/react-query';
import { useRepo } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { offersForCountry, sortOffers, bestPriceOfferId, type OfferSort } from '@/lib/commerce';

export function useProduct(id: string | undefined) {
  const repo = useRepo();
  return useQuery({ queryKey: ['product', id], queryFn: () => repo.getProduct(id!), enabled: !!id });
}

export function useMarketplaces() {
  const repo = useRepo();
  return useQuery({ queryKey: ['marketplaces'], queryFn: async () => new Map((await repo.listMarketplaces()).map((m) => [m.id, m])), staleTime: 5 * 60_000 });
}

/** Offers for the shopper's selected country, sorted, with a fair "best price" id if applicable. */
export function useOffers(productId: string | undefined, sort: OfferSort = 'price') {
  const repo = useRepo();
  const { prefs } = usePreferences();
  const q = useQuery({ queryKey: ['offers', productId], queryFn: () => repo.listOffers(productId!), enabled: !!productId });
  const all = q.data ?? [];
  const local = sortOffers(offersForCountry(all, prefs.country), sort);
  const elsewhere = all.filter((o) => o.country !== prefs.country);
  return { ...q, local, elsewhere, bestId: bestPriceOfferId(local), country: prefs.country };
}
