# Ekran ve Rota Envanteri / Screen & Route Inventory

Kaynak: `src/config/routes.ts` (uygulama içinde **Güncellemeler → Ekran durumu** sekmesinde de görünür).
**Toplam 113** — ✅ 54 çalışıyor · 🟡 4 kısmi · ⏳ 55 planlandı


| # | Ekran | Rota | Kabuk | Faz | Durum |
|---|---|---|---|---|---|
| 1 | Açılış ekranı | `/ (boot)` | public | 1 | ✅ Çalışıyor |
| 2 | Tanıtım sayfası | `/welcome` | public | 1 | ✅ Çalışıyor |
| 3 | Dil ve ülke seçimi | `/welcome/locale` | public | 1 | ✅ Çalışıyor |
| 4 | Giriş | `/auth/sign-in` | auth | 1 | ✅ Çalışıyor |
| 5 | Kayıt | `/auth/register` | auth | 1 | ✅ Çalışıyor |
| 6 | Sosyal giriş | `/auth/sign-in#social` | auth | 1 | 🟡 Kısmi |
| 7 | E-posta doğrulama | `/auth/verify` | auth | 1 | ✅ Çalışıyor |
| 8 | Şifre sıfırlama | `/auth/reset` | auth | 1 | ✅ Çalışıyor |
| 9 | Rol ve ilgi alanı | `/onboarding` | auth | 1 | ✅ Çalışıyor |
| 10 | İçerik üretici onboarding | `/onboarding/creator` | auth | 1 | ✅ Çalışıyor |
| 11 | Marka kaydı | `/onboarding/brand` | auth | 5 | ⏳ Planlandı |
| 12 | Şartlar, gizlilik, onaylar | `/legal/:doc` | public | 1 | ✅ Çalışıyor |
| 13 | Sana Özel akışı | `/` | app | 2 | ✅ Çalışıyor |
| 14 | Takip akışı | `/?feed=following` | app | 2 | ✅ Çalışıyor |
| 15 | Video / Reels | `/reels` | app | 2 | ✅ Çalışıyor |
| 16 | Foto karusel | `/p/:postId (carousel)` | app | 2 | ✅ Çalışıyor |
| 17 | Gönderi detayı | `/p/:postId` | app | 2 | ✅ Çalışıyor |
| 18 | Yorumlar | `/p/:postId#comments` | app | 2 | ✅ Çalışıyor |
| 19 | Beğenenler | `/p/:postId#likes` | app | 2 | ✅ Çalışıyor |
| 20 | Paylaş | `(share sheet)` | app | 2 | ✅ Çalışıyor |
| 21 | Koleksiyona kaydet | `(save sheet)` | app | 2 | ✅ Çalışıyor |
| 22 | Koleksiyonlar | `/saved` | app | 2 | ✅ Çalışıyor |
| 23 | Keşfet | `/explore` | app | 2 | ✅ Çalışıyor |
| 24 | Arama sonuçları | `/search?q=` | app | 2 | ✅ Çalışıyor |
| 25 | Arama filtreleri | `/search (filters)` | app | 2 | ✅ Çalışıyor |
| 26 | Trend ürünler | `/explore/trending/products` | app | 2 | ✅ Çalışıyor |
| 27 | Trend içerik üreticiler | `/explore/trending/creators` | app | 2 | ✅ Çalışıyor |
| 28 | Trend markalar | `/explore/trending/brands` | app | 2 | ✅ Çalışıyor |
| 29 | Kategori keşfi | `/explore/c/:slug` | app | 2 | ✅ Çalışıyor |
| 30 | Hashtag keşfi | `/tag/:tag` | app | 2 | ✅ Çalışıyor |
| 31 | İçerik üretici profili | `/@:username` | app | 2 | ✅ Çalışıyor |
| 32 | Marka profili | `/@:username (brand)` | app | 2 | ✅ Çalışıyor |
| 33 | Takipçiler / takip edilenler | `/@:username/followers` | app | 2 | ✅ Çalışıyor |
| 34 | Mesaj kutusu | `/messages` | app | 2 | ✅ Çalışıyor |
| 35 | Sohbet | `/messages/:id` | app | 2 | ✅ Çalışıyor |
| 36 | Bildirimler | `/activity` | app | 2 | ✅ Çalışıyor |
| 37 | İçerik / kullanıcı bildir | `(report dialog)` | app | 2 | ✅ Çalışıyor |
| 38 | Ürün hızlı görünüm | `(product sheet)` | app | 3 | ✅ Çalışıyor |
| 39 | Ürün detayı | `/product/:id` | app | 3 | ✅ Çalışıyor |
| 40 | Satıcı teklif karşılaştırma | `/product/:id#offers` | app | 3 | ✅ Çalışıyor |
| 41 | Satıcı bilgisi | `/merchant/:id` | app | 3 | 🟡 Kısmi |
| 42 | Ürün değerlendirmeleri | `/product/:id/reviews` | app | 3 | ⏳ Planlandı |
| 43 | Ürünü içeren içerikler | `/product/:id#creators` | app | 3 | ✅ Çalışıyor |
| 44 | Benzer ürünler | `/product/:id#similar` | app | 3 | ✅ Çalışıyor |
| 45 | Kaydedilen ürünler | `/saved?tab=products` | app | 3 | ✅ Çalışıyor |
| 46 | Fiyat alarmları | `/settings/price-alerts` | app | 3 | ✅ Çalışıyor |
| 47 | Satıcıya yönlendirme onayı | `(outbound dialog)` | app | 3 | ✅ Çalışıyor |
| 48 | Sipariş takibi | `/orders` | app | 4 | ⏳ Planlandı |
| 49 | Studio genel bakış | `/studio` | studio | 4 | 🟡 Kısmi |
| 50 | Foto gönderi oluştur | `/create?type=photo` | app | 2 | ✅ Çalışıyor |
| 51 | Video gönderi oluştur | `/create?type=video` | app | 2 | ✅ Çalışıyor |
| 52 | Medya yükleme | `/create (media step)` | app | 2 | ✅ Çalışıyor |
| 53 | Ürün etiketleme tuvali | `/create (tag step)` | app | 2 | ✅ Çalışıyor |
| 54 | Katalog arama | `/create (product search)` | app | 2 | ✅ Çalışıyor |
| 55 | Harici ürün önerisi | `/create (propose product)` | app | 2 | ✅ Çalışıyor |
| 56 | Ürün eşleştirme onayı | `/create (match confirm)` | app | 3 | 🟡 Kısmi |
| 57 | Açıklama ve hashtag | `/create (caption step)` | app | 2 | ✅ Çalışıyor |
| 58 | AI içerik asistanı | `/studio/ai` | studio | 7 | ⏳ Planlandı |
| 59 | Taslaklar | `/studio/drafts` | studio | 2 | ✅ Çalışıyor |
| 60 | Zamanlanmış gönderiler | `/studio/scheduled` | studio | 2 | ✅ Çalışıyor |
| 61 | İçerik kütüphanesi | `/studio/content` | studio | 2 | ✅ Çalışıyor |
| 62 | Gönderi analitiği | `/studio/analytics` | studio | 4 | ⏳ Planlandı |
| 63 | Ürün performansı | `/studio/products` | studio | 4 | ⏳ Planlandı |
| 64 | Affiliate bağlantıları | `/studio/links` | studio | 4 | ⏳ Planlandı |
| 65 | Kampanya fırsatları | `/studio/campaigns` | studio | 5 | ⏳ Planlandı |
| 66 | Kampanya başvuruları | `/studio/campaigns/applications` | studio | 5 | ⏳ Planlandı |
| 67 | Marka iş birlikleri | `/studio/collaborations` | studio | 5 | ⏳ Planlandı |
| 68 | Kazançlar | `/studio/earnings` | studio | 4 | ⏳ Planlandı |
| 69 | Komisyon işlemleri | `/studio/earnings/transactions` | studio | 4 | ⏳ Planlandı |
| 70 | Bekleyen / onaylı / iade kazançlar | `/studio/earnings/status` | studio | 4 | ⏳ Planlandı |
| 71 | Ödeme hesabı kurulumu | `/studio/payouts/setup` | studio | 4 | ⏳ Planlandı |
| 72 | Ödeme talebi | `/studio/payouts/request` | studio | 4 | ⏳ Planlandı |
| 73 | Ödeme geçmişi | `/studio/payouts` | studio | 4 | ⏳ Planlandı |
| 74 | İçerik üretici ayarları | `/studio/settings` | studio | 2 | ✅ Çalışıyor |
| 75 | Marka paneli | `/brand` | brand | 5 | ⏳ Planlandı |
| 76 | Organizasyon ayarları | `/brand/settings` | brand | 5 | ⏳ Planlandı |
| 77 | Ürün kataloğu | `/brand/catalog` | brand | 5 | ⏳ Planlandı |
| 78 | Ürün oluştur / düzenle | `/brand/catalog/:id` | brand | 5 | ⏳ Planlandı |
| 79 | Satıcı teklifleri | `/brand/offers` | brand | 5 | ⏳ Planlandı |
| 80 | Komisyon kuralları | `/brand/commissions` | brand | 5 | ⏳ Planlandı |
| 81 | Kampanyalar | `/brand/campaigns` | brand | 5 | ⏳ Planlandı |
| 82 | Kampanya oluştur | `/brand/campaigns/new` | brand | 5 | ⏳ Planlandı |
| 83 | Bütçe ve uygunluk | `/brand/campaigns/new/budget` | brand | 5 | ⏳ Planlandı |
| 84 | İçerik üretici keşfi | `/brand/creators` | brand | 5 | ⏳ Planlandı |
| 85 | İçerik üretici karşılaştırma | `/brand/creators/compare` | brand | 5 | ⏳ Planlandı |
| 86 | Davetler | `/brand/invitations` | brand | 5 | ⏳ Planlandı |
| 87 | Başvurular | `/brand/applications` | brand | 5 | ⏳ Planlandı |
| 88 | Teslimatlar | `/brand/deliverables` | brand | 5 | ⏳ Planlandı |
| 89 | İş birliği kutusu | `/brand/inbox` | brand | 5 | ⏳ Planlandı |
| 90 | Kampanya performansı | `/brand/performance` | brand | 5 | ⏳ Planlandı |
| 91 | Dönüşüm ve ROI raporu | `/brand/roi` | brand | 5 | ⏳ Planlandı |
| 92 | Faturalama | `/brand/billing` | brand | 5 | ⏳ Planlandı |
| 93 | Ekip yetkileri | `/brand/team` | brand | 5 | ⏳ Planlandı |
| 94 | Yönetici paneli | `/admin` | admin | 6 | ⏳ Planlandı |
| 95 | Kullanıcılar ve roller | `/admin/users` | admin | 6 | ⏳ Planlandı |
| 96 | İçerik üretici doğrulama | `/admin/verification/creators` | admin | 6 | ⏳ Planlandı |
| 97 | Marka doğrulama | `/admin/verification/brands` | admin | 6 | ⏳ Planlandı |
| 98 | Ürün moderasyonu | `/admin/moderation/products` | admin | 6 | ⏳ Planlandı |
| 99 | İçerik moderasyonu | `/admin/moderation/content` | admin | 6 | ⏳ Planlandı |
| 100 | Affiliate partner kaydı | `/admin/affiliates` | admin | 6 | ⏳ Planlandı |
| 101 | Pazaryeri entegrasyonları | `/admin/marketplaces` | admin | 6 | ⏳ Planlandı |
| 102 | İzleme sağlığı | `/admin/tracking` | admin | 6 | ⏳ Planlandı |
| 103 | Dönüşüm mutabakatı | `/admin/reconciliation` | admin | 6 | ⏳ Planlandı |
| 104 | Komisyon kuralları (platform) | `/admin/commissions` | admin | 6 | ⏳ Planlandı |
| 105 | Ödeme incelemesi | `/admin/payouts` | admin | 6 | ⏳ Planlandı |
| 106 | İtirazlar ve iadeler | `/admin/disputes` | admin | 6 | ⏳ Planlandı |
| 107 | Dolandırıcılık sinyalleri | `/admin/fraud` | admin | 6 | ⏳ Planlandı |
| 108 | Raporlar ve analitik | `/admin/reports` | admin | 6 | ⏳ Planlandı |
| 109 | Yerelleştirme ayarları | `/admin/localization` | admin | 7 | ⏳ Planlandı |
| 110 | Özellik bayrakları | `/admin/flags` | admin | 6 | ⏳ Planlandı |
| 111 | Denetim kaydı | `/admin/audit` | admin | 6 | ⏳ Planlandı |
| 112 | Destek talepleri | `/admin/support` | admin | 6 | ⏳ Planlandı |
| 113 | Sistem ayarları | `/admin/system` | admin | 6 | ⏳ Planlandı |
