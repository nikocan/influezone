/**
 * In-app release notes ("Güncellemeler"). Every delivered work package appends an entry here so
 * progress can be followed from inside the application. Newest first.
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  title: { tr: string; en: string };
  items: { tr: string; en: string; area: 'foundation' | 'social' | 'commerce' | 'creator' | 'brand' | 'admin' | 'security' | 'i18n' | 'quality' }[];
  pending?: { tr: string; en: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-10-31',
    title: { tr: 'Shopfluence temeli: Faz 1 + Faz 2', en: 'Shopfluence foundation: Phase 1 + Phase 2' },
    items: [
      { area: 'foundation', tr: 'Yeni tasarım sistemi (renk, tipografi, köşe, boşluk token\'ları), açık/koyu/sistem teması', en: 'New design system (color, type, radius, spacing tokens), light/dark/system theme' },
      { area: 'foundation', tr: '113 ekranlık rota haritası; mobil alt menü, masaüstü sol menü, Studio / Marka / Admin panel kabukları', en: '113-screen route map; mobile bottom nav, desktop rail, Studio / Brand / Admin portal shells' },
      { area: 'i18n', tr: 'Türkçe (varsayılan) ve İngilizce arayüz; Arapça ile RTL önizleme; ülke, para birimi ve yerel tarih/sayı biçimleri', en: 'Turkish (default) and English UI; RTL preview with Arabic; country, currency and locale-aware dates/numbers' },
      { area: 'foundation', tr: 'Kayıt, giriş, e-posta doğrulama, şifre sıfırlama, rol ve ilgi alanı onboarding\'i, içerik üretici onboarding\'i, onay (KVKK/şartlar) kayıtları', en: 'Register, sign-in, email verification, password reset, role & interest onboarding, creator onboarding, consent records' },
      { area: 'social', tr: 'Sana Özel / Takip / Trend akışları, kategori filtreleri, öneri algoritması (şeffaf sıralama)', en: 'For You / Following / Trending feeds, category filters, transparent ranking' },
      { area: 'social', tr: 'Foto, karusel ve dikey video gönderileri; görünürken otomatik oynatma, sessiz/sesli, altyazı, ilerleme çubuğu', en: 'Photo, carousel and vertical video posts; visibility-based autoplay, mute, captions, progress' },
      { area: 'social', tr: 'Beğeni, yorum/yanıt, @bahsetme, #hashtag, kaydet/koleksiyon, paylaş, DM ile gönder, takip/takipçi listeleri', en: 'Likes, comments/replies, @mentions, #hashtags, save/collections, share, send via DM, follower lists' },
      { area: 'social', tr: 'Keşfet, arama + filtreler, trend içerik üretici/ürün/marka/hashtag sayfaları, kategori ve hashtag sayfaları', en: 'Explore, search + filters, trending creators/products/brands/hashtags, category & hashtag pages' },
      { area: 'social', tr: 'Direkt mesajlar: kişisel ve marka iş birliği kutuları ayrı, mesaj istekleri, spam limiti', en: 'Direct messages: separate personal and brand-collaboration inboxes, message requests, spam limits' },
      { area: 'social', tr: 'Bildirimler, engelle/sessize al, gizli hesap, içerik/kullanıcı raporlama', en: 'Notifications, block/mute, private accounts, content/user reporting' },
      { area: 'creator', tr: 'Gönderi oluşturma: çoklu foto/video yükleme, alternatif metin, ürün etiketleme tuvali, katalog arama, yeni ürün önerme, açıklama, reklam/iş birliği beyanı, taslak ve zamanlama', en: 'Post creation: multi photo/video upload, alt text, product tagging canvas, catalog search, propose product, caption, ad disclosure, drafts & scheduling' },
      { area: 'commerce', tr: 'Ürün hızlı görünüm, ürün detay, ülkeye göre satıcı teklif karşılaştırması; "En iyi fiyat" yalnızca adil karşılaştırmada; eski/tahmini fiyat uyarıları; fiyat alarmı; satıcıya yönlendirme onayı', en: 'Product quick view & detail, per-country offer comparison; "Best price" only when fair; stale/estimated warnings; price alerts; outbound confirmation' },
      { area: 'security', tr: 'Supabase veritabanı şeması + RLS politikaları (4 migration) ve 46 otomatik güvenlik testi', en: 'Supabase schema + RLS policies (4 migrations) and 46 automated security tests' },
      { area: 'quality', tr: 'Birim ve bileşen testleri; yükleniyor/boş/hata durumları; klavye ve ekran okuyucu erişilebilirliği', en: 'Unit & component tests; loading/empty/error states; keyboard & screen-reader accessibility' },
      { area: 'foundation', tr: 'Bu "Güncellemeler" sayfası ve ekran durum tablosu', en: 'This "Updates" page and the screen status table' },
    ],
    pending: [
      { tr: 'Supabase projesi bağlanmadı — uygulama şu an DEMO modunda (örnek veri, tarayıcıda saklanır)', en: 'No Supabase project connected — app runs in DEMO mode (sample data stored in the browser)' },
      { tr: 'Gerçek satıcı/affiliate bağlantıları, dönüşüm takibi, komisyon defteri ve ödemeler (Faz 3–4) sözleşme ve entegrasyon bekliyor', en: 'Real merchant/affiliate links, conversion tracking, commission ledger and payouts (Phases 3–4) await contracts and integrations' },
      { tr: 'Marka portalı (Faz 5), Admin ve güvenlik konsolu (Faz 6), AI asistan (Faz 7)', en: 'Brand portal (Phase 5), Admin & safety console (Phase 6), AI assistant (Phase 7)' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-01',
    title: { tr: 'İlk prototip (project 2/)', en: 'Initial prototype (project 2/)' },
    items: [
      { area: 'foundation', tr: 'Sahte giriş ve statik panellerden oluşan ilk Vite + React prototipi. Referans olarak korunuyor.', en: 'First Vite + React prototype with mock login and static dashboards. Kept for reference.' },
    ],
  },
];
