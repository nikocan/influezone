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
    version: '0.4.0',
    date: '2026-11-06',
    title: { tr: 'Faz 5: Marka Portalı ve kampanyalar', en: 'Phase 5: Brand portal & campaigns' },
    items: [
      { area: 'brand', tr: 'Marka kaydı: organizasyon + herkese açık marka profili; doğrulama yalnızca platform ekibi tarafından', en: 'Brand registration: organisation + public brand profile; verification by the platform team only' },
      { area: 'brand', tr: 'Ekip yetkileri: Sahip / Yönetici / Kampanya yöneticisi / Analist / Üye; kullanıcı adıyla ekip üyesi ekleme', en: 'Team permissions: Owner / Admin / Campaign manager / Analyst / Member; add members by username' },
      { area: 'brand', tr: 'Ürün kataloğu: yeni ürünler moderasyon onayına gider; teklifler yalnızca satıcı akışından (elle fiyat yok)', en: 'Product catalog: new products go to moderation; offers come only from seller feeds (no manual prices)' },
      { area: 'brand', tr: 'Kampanya oluşturucu: sabit ücret / affiliate / hibrit, bütçe, hedef ülke ve kategori, minimum takipçi, teslimatlar, zorunlu reklam beyanı, ürünler, tarihler', en: 'Campaign builder: fixed fee / affiliate / hybrid, budget, countries & categories, minimum followers, deliverables, required disclosure, products, dates' },
      { area: 'brand', tr: 'Kampanya durumları: Taslak → Onay bekliyor → Başvuruya açık → Devam ediyor → Tamamlandı (+ Duraklatıldı, İptal). Marka kendi kampanyasını yayına alamaz; ticari şartlar gönderimden sonra kilitlenir', en: 'Campaign statuses: Draft → Pending approval → Open → In progress → Completed (+ Paused, Cancelled). Brands cannot self-approve; commercial terms lock after submission' },
      { area: 'brand', tr: 'İçerik üretici keşfi (filtreler, gerçek etkileşim oranı, beyanlı içerik oranı), en fazla 3 kişiyi karşılaştırma, davet gönderme', en: 'Creator discovery (filters, real engagement rate, disclosed-content share), compare up to 3, send invitations' },
      { area: 'brand', tr: 'Başvurular, davetler, teslimat onayı / değişiklik isteme, iş birliği kutusu, kampanya performansı ve etkileşim başı maliyet', en: 'Applications, invitations, deliverable approval / change requests, collaboration inbox, campaign performance and cost per engagement' },
      { area: 'creator', tr: 'Studio: kampanya fırsatları (uygunluk nedenleriyle), başvurular ve davetler, iş birlikleri ve teslimat gönderme', en: 'Studio: campaign opportunities (with eligibility reasons), applications & invitations, collaborations and deliverable submission' },
      { area: 'security', tr: 'Teslim edilen gönderi kampanyanın zorunlu beyanını taşımıyorsa kabul edilmez; marka ekibi kendi kampanyasına katılamaz (çıkar çatışması)', en: 'Deliverables without the required disclosure are rejected; brand team members cannot join their own campaigns (conflict of interest)' },
      { area: 'quality', tr: '22 yeni veritabanı testi (toplam 98), 8 yeni birim testi (toplam 70), uçtan uca senaryo 28 adım', en: '22 new database tests (98 total), 8 new unit tests (70 total), end-to-end scenario 28 steps' },
    ],
    pending: [
      { tr: 'Marka faturalama ve kampanya ödemelerinin tahsilatı (ödeme sağlayıcı entegrasyonu)', en: 'Brand billing and campaign payment collection (payment provider integration)' },
      { tr: 'Marka adına (marka profiliyle) gönderi ve mesaj; şimdilik iş birliği mesajları kişisel hesaptan', en: 'Posting and messaging as the brand profile; collaboration messages currently come from the personal account' },
      { tr: 'Gelir bazlı ROI için satıcı sipariş verisi', en: 'Merchant order data for revenue-based ROI' },
      { tr: 'Yönetim konsolu: marka doğrulama, kampanya onay kuyruğu, ürün moderasyonu (Faz 6)', en: 'Admin console: brand verification, campaign approval queue, product moderation (Phase 6)' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-05',
    title: { tr: 'Faz 4: İçerik üretici gelirleri (ödeme gönderimi kapalı)', en: 'Phase 4: Creator monetisation (payout sending disabled)' },
    items: [
      { area: 'security', tr: 'Değiştirilemez çift taraflı muhasebe defteri: her işlem sıfıra dengelenir, kayıtlar silinemez/değiştirilemez; düzeltmeler ters kayıtla yapılır', en: 'Immutable double-entry ledger: every transaction balances to zero; entries cannot be edited or deleted, corrections are reversing entries' },
      { area: 'creator', tr: 'Dönüşüm içe aktarma: aynı satış bildirimi iki kez sayılmaz; atıf süresi dışındaki ve kendi bağlantınla yapılan alımlar reddedilir', en: 'Conversion ingestion: the same sale report is never counted twice; out-of-window and self-purchases are rejected' },
      { area: 'creator', tr: 'Komisyon kuralları (en özel kural kazanır), bloke/iade süresi, kısmi ve tam iade düşümü', en: 'Commission rules (most specific wins), hold/refund window, partial and full refund reversals' },
      { area: 'creator', tr: 'Kazançlar ekranı: Tahmini / Beklemede / Onaylı / Çekilebilir / Ödemede / Ödendi / İade — her para birimi ayrı', en: 'Earnings screen: Estimated / Pending / Approved / Available / In payout / Paid / Reversed — per currency' },
      { area: 'creator', tr: 'Komisyon işlemleri listesi (durum filtresi, red nedeni, iade tutarı)', en: 'Commission transactions list (status filter, rejection reason, reversed amount)' },
      { area: 'creator', tr: 'Affiliate bağlantı yöneticisi (yetkili program yoksa "takip etkin değil" açıkça yazılır)', en: 'Affiliate link manager (clearly shows "tracking inactive" without an authorised programme)' },
      { area: 'creator', tr: 'Ödeme hesabı kurulumu, ödeme talebi (doğrulanmış hesap + KYC + vergi belgesi şartı, bakiye blokesi) ve ödeme geçmişi zaman çizelgesi', en: 'Payout account setup, payout request (verified account + KYC + tax form required, funds held) and payout history timeline' },
      { area: 'creator', tr: 'Gönderi analitiği (etkileşim oranı) ve ürün performansı (tıklama → onaylı satış)', en: 'Post analytics (engagement rate) and product performance (clicks → confirmed sales)' },
      { area: 'admin', tr: 'Yönetici ödeme onayı (kişi kendi ödemesini onaylayamaz), özellik bayrağı ile kapalı ödeme gönderimi, tüm finans işlemleri denetim kaydına yazılır', en: 'Admin payout review (no self-approval), payout sending gated by a feature flag, all financial actions audited' },
      { area: 'quality', tr: '30 yeni veritabanı finans testi (toplam 76), 10 yeni birim testi (toplam 62), uçtan uca senaryo 23 adım', en: '30 new database finance tests (76 total), 10 new unit tests (62 total), end-to-end scenario 23 steps' },
      { area: 'quality', tr: 'Düzeltme: demo ile veritabanı arasındaki kuruş yuvarlama farkı giderildi (262,465 → 262,47)', en: 'Fix: cent rounding mismatch between demo and database resolved (262.465 → 262.47)' },
      { area: 'quality', tr: 'Düzeltme: geç yüklenen görseller artık yedek görüntüde takılı kalmıyor', en: 'Fix: images whose source loads late no longer stay stuck on the fallback' },
    ],
    pending: [
      { tr: 'Gerçek affiliate ağı / satıcı sözleşmesi ve imzalı webhook ile dönüşüm alımı', en: 'Real affiliate network / merchant contract and signed-webhook conversion ingestion' },
      { tr: 'Ödeme sağlayıcı (ör. Stripe Connect, Wise), KYC ve vergi belgesi entegrasyonu — ödeme gönderimi bunlar doğrulanana kadar kapalı', en: 'Payout provider (e.g. Stripe Connect, Wise), KYC and tax-form integration — payout sending stays off until verified' },
      { tr: 'Bloke süresi dolan kayıtları otomatik onaylayan sunucu görevi (pg_cron)', en: 'Server job (pg_cron) that releases conversions after the hold window' },
      { tr: 'Yönetici ödeme inceleme ve mutabakat ekranları (Faz 6)', en: 'Admin payout review and reconciliation screens (Phase 6)' },
    ],
  },
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
