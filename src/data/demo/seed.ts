/**
 * SAMPLE DATA — demo mode only.
 * All people, brands, merchants, prices and engagement numbers below are fictional
 * and are rendered with a visible "Sample" label. Nothing here is loaded when Supabase is configured.
 */
import type { Comment, Marketplace, Offer, Post, Product, Profile } from '../types';

const U = (id: string, w = 900, h = 1125) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const A = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=160&h=160&q=70`;
const hoursAgo = (h: number, now: number) => new Date(now - h * 36e5).toISOString();

export const CATEGORIES = [
  { slug: 'fashion', icon: 'Shirt' },
  { slug: 'beauty', icon: 'Sparkles' },
  { slug: 'tech', icon: 'Headphones' },
  { slug: 'home', icon: 'Lamp' },
  { slug: 'fitness', icon: 'Dumbbell' },
  { slug: 'food', icon: 'UtensilsCrossed' },
  { slug: 'travel', icon: 'Plane' },
  { slug: 'accessories', icon: 'Watch' },
] as const;

export const INTERESTS = CATEGORIES.map((c) => c.slug);

function profile(p: Partial<Profile> & Pick<Profile, 'id' | 'username' | 'displayName'>): Profile {
  return {
    avatarUrl: null,
    bio: '',
    country: 'TR',
    locale: 'tr',
    kind: 'person',
    isCreator: true,
    verified: false,
    website: null,
    interests: [],
    onboardingCompleted: true,
    isPrivate: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: '2026-01-10T10:00:00.000Z',
    isSample: true,
    ...p,
  };
}

export function seedProfiles(): Profile[] {
  return [
    profile({ id: 'p_elif', username: 'elif.stil', displayName: 'Elif Aydın', avatarUrl: A('1494790108377-be9c29b29330'), bio: 'Günlük stil, kapsül gardırop ve dürüst ürün yorumları. İstanbul.', interests: ['fashion', 'beauty'], followerCount: 48210, followingCount: 312, verified: true }),
    profile({ id: 'p_mert', username: 'mert.tech', displayName: 'Mert Kaya', avatarUrl: A('1507003211169-0a1dd7228f2d'), bio: 'Teknoloji incelemeleri, masa kurulumları ve ses ekipmanları.', interests: ['tech', 'home'], followerCount: 22950, followingCount: 188 }),
    profile({ id: 'p_zeynep', username: 'zeynep.glow', displayName: 'Zeynep Arslan', avatarUrl: A('1438761681033-6461ffad8d80'), bio: 'Cilt bakımı rutinleri • içerik listesi okuyan biri.', interests: ['beauty'], followerCount: 31780, followingCount: 402, verified: true }),
    profile({ id: 'p_can', username: 'can.moves', displayName: 'Can Demir', avatarUrl: A('1500648767791-00dcc994a43e'), bio: 'Koşu, outdoor ve fonksiyonel antrenman.', interests: ['fitness', 'travel'], followerCount: 12040, followingCount: 95 }),
    profile({ id: 'p_lara', username: 'lara.home', displayName: 'Lara Bennett', avatarUrl: A('1534528741775-53994a69daeb'), bio: 'Small spaces, warm light, slow living. London.', country: 'GB', locale: 'en', interests: ['home', 'food'], followerCount: 18630, followingCount: 240 }),
    profile({ id: 'p_noah', username: 'noah.fits', displayName: 'Noah Rivera', avatarUrl: A('1517841905240-472988babdf9'), bio: 'Streetwear & sneakers. NYC.', country: 'US', locale: 'en', interests: ['fashion', 'accessories'], followerCount: 9420, followingCount: 130 }),
    // brands
    profile({ id: 'b_lumora', username: 'lumorabeauty', displayName: 'Lumora Beauty', kind: 'brand', isCreator: false, bio: 'Clean, minimal skincare. (Sample brand)', interests: ['beauty'], followerCount: 15400, followingCount: 12, verified: true, website: 'https://example.com/lumora' }),
    profile({ id: 'b_kuzey', username: 'kuzeyoutdoor', displayName: 'Kuzey Outdoor', kind: 'brand', isCreator: false, bio: 'Doğa için tasarlanmış ekipman. (Örnek marka)', interests: ['fitness', 'travel'], followerCount: 8700, followingCount: 20, website: 'https://example.com/kuzey' }),
    profile({ id: 'b_aurelia', username: 'aureliawatches', displayName: 'Aurelia Watches', kind: 'brand', isCreator: false, bio: 'Minimalist timepieces. (Sample brand)', interests: ['accessories'], followerCount: 21050, followingCount: 4, verified: true, website: 'https://example.com/aurelia' }),
    profile({ id: 'b_pixelon', username: 'pixelonaudio', displayName: 'Pixelon Audio', kind: 'brand', isCreator: false, bio: 'Sound you can feel. (Sample brand)', interests: ['tech'], followerCount: 11200, followingCount: 9, website: 'https://example.com/pixelon' }),
  ];
}

export function seedMarketplaces(): Marketplace[] {
  return [
    { id: 'm_nova', name: 'Nova Market', color: '#2563EB', countries: ['TR', 'DE'], isSample: true },
    { id: 'm_atlas', name: 'Atlas Shop', color: '#EA580C', countries: ['TR', 'GB', 'DE'], isSample: true },
    { id: 'm_kervan', name: 'Kervan Store', color: '#0F766E', countries: ['TR'], isSample: true },
    { id: 'm_meridian', name: 'Meridian Mall', color: '#9333EA', countries: ['US', 'GB'], isSample: true },
  ];
}

function product(p: Partial<Product> & Pick<Product, 'id' | 'title' | 'brandName' | 'category' | 'images'>): Product {
  return { brandProfileId: null, variant: null, description: '', gtin: null, countries: ['TR', 'US', 'GB', 'DE'], status: 'approved', isSample: true, ...p };
}

export function seedProducts(): Product[] {
  return [
    product({ id: 'pr_watch', brandProfileId: 'b_aurelia', brandName: 'Aurelia Watches', title: 'Aurelia Classic 38', variant: 'Altın / beyaz kadran', category: 'accessories', images: [U('1523275335684-37898b6baf30', 800, 800)], gtin: '0000000000017', description: '38 mm paslanmaz çelik kasa, safir kristal, 5 ATM su direnci.' }),
    product({ id: 'pr_headphones', brandProfileId: 'b_pixelon', brandName: 'Pixelon Audio', title: 'Pixelon Studio ANC', variant: 'Mat siyah', category: 'tech', images: [U('1505740420928-5e560c06d30e', 800, 800)], gtin: '0000000000024', description: 'Aktif gürültü engelleme, 40 saat pil, çoklu cihaz bağlantısı.' }),
    product({ id: 'pr_sneaker', brandName: 'Strider', title: 'Strider Run One', variant: 'Kırmızı / 42', category: 'fitness', images: [U('1542291026-7eec264c27ff', 800, 800)], description: 'Hafif koşu ayakkabısı, nefes alan örgü üst yüzey.' }),
    product({ id: 'pr_sunglasses', brandName: 'Solé', title: 'Solé Round Polarized', variant: 'Kaplumbağa', category: 'accessories', images: [U('1572635196237-14b3f281503f', 800, 800)], description: 'UV400 polarize cam, asetat çerçeve.' }),
    product({ id: 'pr_serum', brandProfileId: 'b_lumora', brandName: 'Lumora Beauty', title: 'Lumora Daily Serum', variant: '30 ml', category: 'beauty', images: [U('1556228578-8c89e6adf883', 800, 800)], gtin: '0000000000031', description: 'Niasinamid ve hyaluronik asit içeren hafif serum.' }),
    product({ id: 'pr_palette', brandProfileId: 'b_lumora', brandName: 'Lumora Beauty', title: 'Lumora Nude Palette', variant: '12 renk', category: 'beauty', images: [U('1522335789203-aabd1fc54bc9', 800, 800)], description: 'Mat ve saten bitişli 12 tonlu far paleti.' }),
    product({ id: 'pr_camera', brandName: 'Instaflash', title: 'Instaflash Mini Camera', variant: 'Krem', category: 'tech', images: [U('1526170375885-4d8ecf77b99f', 800, 800)], description: 'Anında baskı yapan kompakt kamera.' }),
    product({ id: 'pr_jacket', brandProfileId: 'b_kuzey', brandName: 'Kuzey Outdoor', title: 'Kuzey Shell Jacket', variant: 'Haki / M', category: 'fitness', images: [U('1551028719-00167b16eac5', 800, 800)], description: 'Su geçirmez, rüzgar kesen hafif kabuk mont.' }),
    product({ id: 'pr_lamp', brandName: 'Nordlys', title: 'Nordlys Table Lamp', variant: 'Opal cam', category: 'home', images: [U('1507473885765-e6ed057f782c', 800, 800)], description: 'Sıcak ışıklı, kısılabilir masa lambası.' }),
    product({ id: 'pr_sneaker2', brandName: 'Strider', title: 'Strider Court Low', variant: 'Beyaz / 43', category: 'fashion', images: [U('1491553895911-0055eca6402d', 800, 800)], description: 'Deri üst yüzeyli günlük sneaker.' }),
  ];
}

export function seedOffers(now: number): Offer[] {
  const o = (id: string, productId: string, marketplaceId: string, price: number, currency: string, country: string, extra: Partial<Offer> = {}): Offer => ({
    id, productId, marketplaceId, price, currency, country,
    shippingCost: 0, availability: 'in_stock', priceSource: 'merchant_feed', lastUpdated: hoursAgo(3, now), affiliateEligible: true,
    url: null, // demo: no authorized merchant link configured
    ...extra,
  });
  return [
    o('of_w1', 'pr_watch', 'm_nova', 7499, 'TRY', 'TR', { shippingCost: 0, lastUpdated: hoursAgo(2, now) }),
    o('of_w2', 'pr_watch', 'm_atlas', 7299, 'TRY', 'TR', { shippingCost: 49.9, lastUpdated: hoursAgo(5, now) }),
    o('of_w3', 'pr_watch', 'm_kervan', 7650, 'TRY', 'TR', { shippingCost: 0, lastUpdated: hoursAgo(9, now) }),
    o('of_w4', 'pr_watch', 'm_meridian', 189, 'USD', 'US', { shippingCost: 0 }),
    o('of_h1', 'pr_headphones', 'm_nova', 5999, 'TRY', 'TR', { shippingCost: null }),
    o('of_h2', 'pr_headphones', 'm_atlas', 5749, 'TRY', 'TR', { lastUpdated: hoursAgo(40, now) }),
    o('of_h3', 'pr_headphones', 'm_kervan', 6100, 'TRY', 'TR', { priceSource: 'manual_estimate', affiliateEligible: false }),
    o('of_h4', 'pr_headphones', 'm_meridian', 149, 'USD', 'US'),
    o('of_h5', 'pr_headphones', 'm_atlas', 139, 'GBP', 'GB'),
    o('of_s1', 'pr_sneaker', 'm_nova', 3299, 'TRY', 'TR'),
    o('of_s2', 'pr_sneaker', 'm_kervan', 3199, 'TRY', 'TR', { availability: 'out_of_stock' }),
    o('of_s3', 'pr_sneaker', 'm_meridian', 95, 'USD', 'US', { lastUpdated: hoursAgo(120, now) }),
    o('of_g1', 'pr_sunglasses', 'm_atlas', 1899, 'TRY', 'TR'),
    o('of_g2', 'pr_sunglasses', 'm_nova', 1949, 'TRY', 'TR', { shippingCost: 0 }),
    o('of_se1', 'pr_serum', 'm_kervan', 649, 'TRY', 'TR'),
    o('of_se2', 'pr_serum', 'm_nova', 629, 'TRY', 'TR', { shippingCost: 29.9 }),
    o('of_se3', 'pr_serum', 'm_atlas', 22, 'EUR', 'DE'),
    o('of_pa1', 'pr_palette', 'm_atlas', 899, 'TRY', 'TR', { availability: 'unknown', lastUpdated: hoursAgo(80, now) }),
    o('of_c1', 'pr_camera', 'm_nova', 3499, 'TRY', 'TR'),
    o('of_c2', 'pr_camera', 'm_meridian', 79, 'USD', 'US'),
    o('of_j1', 'pr_jacket', 'm_kervan', 4290, 'TRY', 'TR'),
    o('of_j2', 'pr_jacket', 'm_atlas', 4390, 'TRY', 'TR', { shippingCost: 0 }),
    o('of_l1', 'pr_lamp', 'm_atlas', 59, 'GBP', 'GB'),
    o('of_l2', 'pr_lamp', 'm_nova', 1790, 'TRY', 'TR', { priceSource: 'manual_estimate' }),
    o('of_s21', 'pr_sneaker2', 'm_nova', 2799, 'TRY', 'TR'),
    o('of_s22', 'pr_sneaker2', 'm_meridian', 85, 'USD', 'US'),
  ];
}

const VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';

export function seedPosts(now: number): Post[] {
  const base = (p: Partial<Post> & Pick<Post, 'id' | 'authorId' | 'media' | 'caption'>): Post => ({
    type: 'photo', hashtags: [], tags: [], disclosure: 'none', category: null, country: null, status: 'published', scheduledAt: null,
    likeCount: 0, commentCount: 0, saveCount: 0, shareCount: 0, viewCount: 0, createdAt: hoursAgo(5, now), isSample: true, ...p,
  });
  const img = (id: string, photo: string, alt: string, w = 900, h = 1125) => ({ id, type: 'image' as const, url: U(photo, w, h), width: w, height: h, alt });
  return [
    base({ id: 'po_1', authorId: 'p_elif', category: 'accessories', disclosure: 'affiliate', createdAt: hoursAgo(2, now),
      media: [img('me_1a', '1515886657613-9f3515b0c78f', 'Bej trençkot ve altın saat ile şehir kombini'), img('me_1b', '1523275335684-37898b6baf30', 'Altın kasalı saat yakın çekim')],
      type: 'carousel', caption: 'Sonbahar kapsül gardırobunun yıldızı: tek bir klasik saat her kombini toparlıyor ✨ #sonbaharstili #kapsülgardırop', hashtags: ['sonbaharstili', 'kapsülgardırop'],
      tags: [{ id: 't1', productId: 'pr_watch', mediaIndex: 0, x: 0.38, y: 0.56 }, { id: 't2', productId: 'pr_sunglasses', mediaIndex: 0, x: 0.52, y: 0.16 }, { id: 't3', productId: 'pr_watch', mediaIndex: 1, x: 0.5, y: 0.5 }],
      likeCount: 2140, commentCount: 3, saveCount: 410, shareCount: 88, viewCount: 31000 }),
    base({ id: 'po_2', authorId: 'p_mert', category: 'tech', disclosure: 'sponsored', createdAt: hoursAgo(6, now), type: 'video',
      media: [{ id: 'me_2', type: 'video', url: `${VIDEO}ForBiggerJoyrides.mp4`, posterUrl: U('1505740420928-5e560c06d30e', 720, 1280), width: 720, height: 1280, alt: 'Kulaklık inceleme videosu' }],
      caption: '2 hafta Pixelon Studio ANC kullandım. Gürültü engelleme metroda gerçekten fark yaratıyor. Artı ve eksiler videoda. #teknoloji #inceleme', hashtags: ['teknoloji', 'inceleme'],
      tags: [{ id: 't4', productId: 'pr_headphones', mediaIndex: 0, x: 0.5, y: 0.42 }], likeCount: 1180, commentCount: 2, saveCount: 230, shareCount: 41, viewCount: 22400 }),
    base({ id: 'po_3', authorId: 'p_zeynep', category: 'beauty', disclosure: 'gifted', createdAt: hoursAgo(11, now),
      media: [img('me_3', '1556228578-8c89e6adf883', 'Serum ve krem şişeleri mermer zemin üzerinde')],
      caption: 'Sabah rutini 3 adım: temizleyici, serum, SPF. Lumora serumu hediye olarak geldi; 4 haftalık dürüst yorumum yorumlarda. #ciltbakımı #rutin', hashtags: ['ciltbakımı', 'rutin'],
      tags: [{ id: 't5', productId: 'pr_serum', mediaIndex: 0, x: 0.45, y: 0.5 }], likeCount: 3210, commentCount: 2, saveCount: 920, shareCount: 150, viewCount: 41000 }),
    base({ id: 'po_4', authorId: 'p_can', category: 'fitness', createdAt: hoursAgo(20, now),
      media: [img('me_4', '1542291026-7eec264c27ff', 'Kırmızı koşu ayakkabısı')],
      caption: 'Haftalık 40 km hedefi tamam. Yeni ayakkabılarla ilk uzun koşu 🏃‍♂️ #koşu #antrenman', hashtags: ['koşu', 'antrenman'],
      tags: [{ id: 't6', productId: 'pr_sneaker', mediaIndex: 0, x: 0.5, y: 0.55 }], likeCount: 640, commentCount: 1, saveCount: 75, shareCount: 12, viewCount: 9800 }),
    base({ id: 'po_5', authorId: 'p_lara', category: 'home', disclosure: 'affiliate', country: 'GB', createdAt: hoursAgo(30, now),
      media: [img('me_5', '1507473885765-e6ed057f782c', 'Warm table lamp on a wooden side table')],
      caption: 'Swapped the overhead light for one warm lamp and the whole flat feels calmer. #slowliving #homedecor', hashtags: ['slowliving', 'homedecor'],
      tags: [{ id: 't7', productId: 'pr_lamp', mediaIndex: 0, x: 0.48, y: 0.4 }], likeCount: 1520, commentCount: 1, saveCount: 610, shareCount: 33, viewCount: 18200 }),
    base({ id: 'po_6', authorId: 'p_noah', category: 'fashion', country: 'US', createdAt: hoursAgo(44, now),
      media: [img('me_6', '1491553895911-0055eca6402d', 'White low-top sneakers')],
      caption: 'Clean whites never miss. Court Low after 3 months of daily wear. #sneakers #streetwear', hashtags: ['sneakers', 'streetwear'],
      tags: [{ id: 't8', productId: 'pr_sneaker2', mediaIndex: 0, x: 0.5, y: 0.6 }], likeCount: 870, commentCount: 0, saveCount: 140, shareCount: 20, viewCount: 12500 }),
    base({ id: 'po_7', authorId: 'p_elif', category: 'beauty', disclosure: 'affiliate', createdAt: hoursAgo(55, now), type: 'video',
      media: [{ id: 'me_7', type: 'video', url: `${VIDEO}ForBiggerBlazes.mp4`, posterUrl: U('1522335789203-aabd1fc54bc9', 720, 1280), width: 720, height: 1280, alt: 'Makyaj paleti uygulama videosu' }],
      caption: '5 dakikada doğal göz makyajı — tek palet, üç ton. #makyaj #pratik', hashtags: ['makyaj', 'pratik'],
      tags: [{ id: 't9', productId: 'pr_palette', mediaIndex: 0, x: 0.5, y: 0.65 }], likeCount: 1990, commentCount: 0, saveCount: 505, shareCount: 61, viewCount: 27800 }),
    base({ id: 'po_8', authorId: 'b_kuzey', category: 'fitness', disclosure: 'sponsored', createdAt: hoursAgo(70, now),
      media: [img('me_8', '1551028719-00167b16eac5', 'Haki rüzgarlık mont')],
      caption: 'Yağmur, rüzgar, yokuş. Kuzey Shell Jacket hepsine hazır. #outdoor #kuzey', hashtags: ['outdoor', 'kuzey'],
      tags: [{ id: 't10', productId: 'pr_jacket', mediaIndex: 0, x: 0.5, y: 0.45 }], likeCount: 410, commentCount: 0, saveCount: 60, shareCount: 9, viewCount: 7400 }),
    base({ id: 'po_9', authorId: 'p_mert', category: 'tech', createdAt: hoursAgo(90, now),
      media: [img('me_9', '1526170375885-4d8ecf77b99f', 'Krem renkli anında baskı kamera')],
      caption: 'Hafta sonu için anında baskı kamera denedim. Filmler pahalı ama anılar paha biçilmez 📸 #fotoğraf', hashtags: ['fotoğraf'],
      tags: [{ id: 't11', productId: 'pr_camera', mediaIndex: 0, x: 0.5, y: 0.5 }], likeCount: 720, commentCount: 0, saveCount: 98, shareCount: 14, viewCount: 10100 }),
  ];
}

export function seedComments(now: number): Comment[] {
  return [
    { id: 'c1', postId: 'po_1', authorId: 'p_zeynep', parentId: null, body: 'Saat çok şık olmuş! Kayış değişiyor mu?', createdAt: hoursAgo(1.5, now) },
    { id: 'c2', postId: 'po_1', authorId: 'p_elif', parentId: 'c1', body: 'Evet, hızlı değişim pimi var 🙌', createdAt: hoursAgo(1.2, now) },
    { id: 'c3', postId: 'po_1', authorId: 'p_noah', parentId: null, body: 'Great layering 🔥', createdAt: hoursAgo(1, now) },
    { id: 'c4', postId: 'po_2', authorId: 'p_can', parentId: null, body: 'Koşarken kulaktan düşüyor mu?', createdAt: hoursAgo(5, now) },
    { id: 'c5', postId: 'po_2', authorId: 'p_mert', parentId: 'c4', body: 'Kafa bantlı olduğu için koşuya uygun değil, onu belirteyim.', createdAt: hoursAgo(4.5, now) },
    { id: 'c6', postId: 'po_3', authorId: 'p_elif', parentId: null, body: 'Hassas cilt için uygun mu?', createdAt: hoursAgo(9, now) },
    { id: 'c7', postId: 'po_3', authorId: 'p_zeynep', parentId: 'c6', body: 'Bende sorun olmadı ama önce yama testi öneririm.', createdAt: hoursAgo(8, now) },
    { id: 'c8', postId: 'po_4', authorId: 'p_mert', parentId: null, body: 'Tebrikler! 💪', createdAt: hoursAgo(18, now) },
    { id: 'c9', postId: 'po_5', authorId: 'p_elif', parentId: null, body: 'So cozy!', createdAt: hoursAgo(25, now) },
  ];
}

export const SAMPLE_FOLLOWS: [string, string][] = [
  ['p_elif', 'p_zeynep'], ['p_zeynep', 'p_elif'], ['p_mert', 'p_can'], ['p_can', 'p_mert'], ['p_noah', 'p_elif'], ['p_lara', 'p_elif'],
];
